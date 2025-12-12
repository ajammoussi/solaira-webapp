import logging
import math
from datetime import datetime, timedelta

import pandas as pd

from quartz_solar_forecast.data import get_nwp, make_pv_data
from quartz_solar_forecast.forecasts import (
    TryolabsSolarPowerPredictor,
    forecast_v1_tilt_orientation,
)
from quartz_solar_forecast.pydantic_models import PVSite
from quartz_solar_forecast.utils.sentry_logging import write_sentry

log = logging.getLogger(__name__)

def predict_ocf(
    site: PVSite,
    model=None, ts: datetime | str = None,
    nwp_source: str = "icon",
    live_generation: pd.DataFrame | None = None,
    days: int = 2
):
    """
    Run the forecast with the gb model, which can take tilt and orientation as inputs

    :param site: the PV site
    :param model: the model to use for prediction
    :param ts: the timestamp of the site. If None, defaults to the current
        timestamp rounded down to 15 minutes.
    :param nwp_source: the nwp data source. Either "gfs", "icon" or "ukmo". Defaults to "icon"
    :param live_generation: a dataframe containing live generation data for the site
    :param days: number of days to forecast (default 2)
    :return: The PV forecast of the site for time (ts) for the specified duration
    """

    if ts is None:
        ts = pd.Timestamp.now().round("15min")

    if isinstance(ts, str):
        ts = datetime.fromisoformat(ts)

    if site.capacity_kwp > 4:
        log.warning(
            "Your site capacity is greater than 4kWp, "
            "however the model is trained on sites with capacity <= 4kWp."
            "We therefore will run the model with a capacity of 4 kWp, "
            "and we'll scale the results afterwards."
        )
        capacity_kwp_original = site.capacity_kwp
        site.capacity_kwp = 4
        if live_generation is not None:
            live_generation['power_kw'] = live_generation['power_kw']/capacity_kwp_original * 4
    else:
        capacity_kwp_original = site.capacity_kwp

    # make pv and nwp data from nwp_source
    # Fetch enough NWP data for the requested duration
    nwp_xr = get_nwp(site=site, ts=ts, nwp_source=nwp_source, days=days + 1)
    pv_xr = make_pv_data(site=site, ts=ts, live_generation=live_generation)

    # load and run models
    # The model predicts 48 hours at a time. We loop to cover the requested days.
    predictions = []
    # We step by 48 hours (2 days)
    steps = math.ceil(days / 2)
    
    for i in range(steps):
        current_ts = ts + pd.Timedelta(days=i * 2)
        pred_df = forecast_v1_tilt_orientation(nwp_source, nwp_xr, pv_xr, current_ts, model=model)
        predictions.append(pred_df)

    # Concatenate predictions
    pred_df = pd.concat(predictions)
    
    # Remove duplicates if any (though stepping by 48h shouldn't overlap much if model is exactly 48h)
    pred_df = pred_df[~pred_df.index.duplicated(keep='first')]
    
    # Limit to requested duration
    end_time = ts + pd.Timedelta(days=days)
    pred_df = pred_df[pred_df.index < end_time]
    
    # Sort just in case
    pred_df = pred_df.sort_index()

    # scale the results if the capacity is different
    if capacity_kwp_original != site.capacity_kwp:
        pred_df["power_kw"] = pred_df["power_kw"] * capacity_kwp_original / site.capacity_kwp

    # Apply additional losses
    # We assume the model predicts for a "standard" system.
    # If the user provides specific loss factors, we apply them here.
    # Note: inverter_efficiency defaults to 1.0, so it only affects if changed.
    # Losses are 0.0 by default (0%).
    total_loss_factor = (
        site.inverter_efficiency
        * (1 - site.shading_loss)
        * (1 - site.soiling_loss)
        * (1 - site.degradation_loss)
    )
    pred_df["power_kw"] = pred_df["power_kw"] * total_loss_factor

    if days > 2:
        pred_df = pred_df.resample("1h").mean()

    return pred_df


def predict_tryolabs(site: PVSite, ts: datetime | str = None):
    """
    Run the forecast with the xgb model

    :param site: the PV site
    :param ts: the timestamp of the site. If None, defaults to the current
        timestamp rounded down to 15 minutes.
    :return: The PV forecast of the site for time (ts) for 48 hours
    """

    # instantiate class to make predictions
    solar_power_predictor = TryolabsSolarPowerPredictor()

    # set start and end time, if no time is given use current time
    if ts is None:
        start_date = pd.Timestamp.now().strftime("%Y-%m-%d")
        start_time = pd.Timestamp.now().round(freq="h")
    else:
        start_date = pd.Timestamp(ts).strftime("%Y-%m-%d")
        start_time = pd.Timestamp(ts).round(freq="h")

    end_time = start_time + pd.Timedelta(hours=48)
    start_date_datetime = datetime.strptime(start_date, "%Y-%m-%d")

    # Check if the start date is more than 3 months ago
    three_months_ago = datetime.today() - timedelta(days=3 * 30)

    if start_date_datetime < three_months_ago:
        print(
            f"Start date ({start_date}) is more than 3 months ago, no",
            "forecast data available.",
        )
    else:
        # download the model from google drive and decompress if necessary
        solar_power_predictor.load_model()
        # make predictions
        predictions = solar_power_predictor.predict_power_output(
            latitude=site.latitude,
            longitude=site.longitude,
            start_date=start_date,
            kwp=site.capacity_kwp,
            orientation=site.orientation,
            tilt=site.tilt,
        )

        # postprocessing of the dataframe
        predictions = predictions[
            (predictions["date"] >= start_time) & (predictions["date"] < end_time)
        ]
        predictions = predictions.reset_index(drop=True)
        predictions.set_index("date", inplace=True)
        print("Predictions finished.")
        return predictions


def run_forecast(
    site: PVSite,
    model: str = "gb",
    ts: datetime | str = None,
    nwp_source: str = "icon",
    live_generation: pd.DataFrame| None = None,
    days: int = 2
) -> pd.DataFrame:
    """
    Predict solar power output for a given site using a specified model.

    :param site: the PV site
    :param model: the model to use for prediction, choose between "ocf" and "tryolabs",
                    by default "ocf" is used
    :param ts: the timestamp of the site. If None, defaults to the current
        timestamp rounded down to 15 minutes.
    :param nwp_source: the nwp data source. Either "gfs", "icon" or "ukmo". Defaults to "icon"
                       (only relevant if model=="gb")
    :param live_generation: a dataframe containing live generation data for the site.
        This should have the columns "power_kw" and "timestamp"
    :param days: number of days to forecast (default 2)
    :return: The PV forecast of the site for time (ts) for the specified duration
    """

    log.info(f"Running forecast for site at lat {site.latitude}, lon {site.longitude} "
              f"at time {ts} with model {model} and nwp source {nwp_source}")

    # log usage to sentry, if you dont want to log usage to sentry, you can
    # 1. set environmental variable QUARTZ_SOLAR_FORECAST_LOGGING='false', or
    # 2. comment out this line
    write_sentry({"site": site.copy(), "model": model, "ts": ts, "nwp_source": nwp_source})

    if model == "gb":
        return predict_ocf(site, None, ts, nwp_source, live_generation, days=days)

    elif model == "xgb":
        if live_generation is not None:
            log.warning("Live generation data is currently not supported with the xgb model. " \
            "Ignoring live_generation input.")
        if days != 2:
             log.warning("The 'xgb' model currently only supports 48-hour forecasts. Ignoring 'days' parameter.")
        return predict_tryolabs(site, ts)

    else:
        raise ValueError(f"Unsupported model: {model}. Choose between 'xgb' and 'gb'")
