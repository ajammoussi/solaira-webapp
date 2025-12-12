from datetime import datetime

from pydantic import BaseModel, Field

from quartz_solar_forecast.inverters.enphase import EnphaseInverter, EnphaseSettings
from quartz_solar_forecast.inverters.givenergy import GivEnergyInverter, GivEnergySettings
from quartz_solar_forecast.inverters.mock import MockInverter
from quartz_solar_forecast.inverters.solarman import SolarmanInverter, SolarmanSettings
from quartz_solar_forecast.inverters.solis import SolisInverter, SolisSettings
from quartz_solar_forecast.inverters.victron import VictronInverter, VictronSettings


class PVSite(BaseModel):
    latitude: float = Field(
        ...,
        description="the latitude of the site",
        ge=-90,
        le=90,
    )
    longitude: float = Field(
        ...,
        description="the longitude of the site",
        ge=-180,
        le=180,
    )
    capacity_kwp: float = Field(
        ...,
        description="the capacity [kwp] of the site",
        ge=0,
    )
    tilt: float = Field(
        default=35,
        description=(
            "the tilt of the site [degrees], the panels' angle relative to horizontal ground"
        ),
        ge=0,
        le=90,
    )
    orientation: float = Field(
        default=180,
        description=(
            "the orientation of the site [degrees], the angle between north and "
            "the direction the panels face, measured on the horizontal plane."
        ),
        ge=0,
        le=360,
    )
    inverter_efficiency: float = Field(
        default=1.0,
        description="The efficiency of the inverter [0-1]. Default is 1.0 (100%) as the model might already account for average losses, but you can adjust downwards.",
        ge=0,
        le=1,
    )
    shading_loss: float = Field(
        default=0.0,
        description="Loss due to shading [0-1]. 0.1 means 10% loss.",
        ge=0,
        le=1,
    )
    soiling_loss: float = Field(
        default=0.0,
        description="Loss due to soiling (dirt/dust) [0-1].",
        ge=0,
        le=1,
    )
    degradation_loss: float = Field(
        default=0.0,
        description="Loss due to module degradation [0-1].",
        ge=0,
        le=1,
    )
    temperature_coefficient: float | None = Field(
        default=None,
        description="Temperature coefficient [%/C]. Currently not used in calculation but stored for reference.",
    )

    def round_latitude_and_longitude(self):
        """Round the latitude and longitude to 2 decimal places

        This is to ensure that the location of the site is not stored exactly.
        """
        self.latitude = round(self.latitude, 2)
        self.longitude = round(self.longitude, 2)


class PVSiteWithInverter(PVSite):
    inverter_type: str = Field(
        default=None,
        description="The type of inverter used",
        json_schema_extra=["enphase", "solis", "givenergy", "solarman", None],
    )

    def get_inverter(self):
        if self.inverter_type == "enphase":
            return EnphaseInverter(EnphaseSettings())
        elif self.inverter_type == "solis":
            return SolisInverter(SolisSettings())
        elif self.inverter_type == "givenergy":
            return GivEnergyInverter(GivEnergySettings())
        elif self.inverter_type == "solarman":
            return SolarmanInverter(SolarmanSettings())
        elif self.inverter_type == "victron":
            return VictronInverter.from_settings(VictronSettings())
        else:
            return MockInverter()


class ForecastRequest(BaseModel):
    site: PVSite
    timestamp: datetime | None = None


class TokenRequest(BaseModel):
    redirect_url: str
