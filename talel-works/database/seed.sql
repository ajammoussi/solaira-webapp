-- Seed 5 days of simple historic data
INSERT INTO user_appliances (name, power_kwh) VALUES
('Washing Machine', 2.5),
('Dishwasher', 1.8),
('HVAC', 3.5);

INSERT INTO weekly_actions (name, power_kwh, preferred_time, week_start, week_end) VALUES
('Weekly Laundry', 2.5, '10:00', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 6 DAY));

INSERT INTO vacation_dates (start_date, end_date) VALUES
(DATE_ADD(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 7 DAY));

-- Minimal historic
INSERT INTO consumption_historic (timestamp, consumption_kwh) VALUES
(DATE_SUB(NOW(), INTERVAL 5 DAY), 6.5),
(DATE_SUB(NOW(), INTERVAL 4 DAY), 6.2),
(DATE_SUB(NOW(), INTERVAL 3 DAY), 5.8),
(DATE_SUB(NOW(), INTERVAL 2 DAY), 6.0),
(DATE_SUB(NOW(), INTERVAL 1 DAY), 6.1);

INSERT INTO weather_historic (timestamp, temperature_c, irradiance_w_m2, wind_speed_m_s, cloud_cover_percent) VALUES
(DATE_SUB(NOW(), INTERVAL 5 DAY), 16, 450, 4.2, 25),
(DATE_SUB(NOW(), INTERVAL 4 DAY), 15, 420, 3.8, 30),
(DATE_SUB(NOW(), INTERVAL 3 DAY), 17, 480, 5.1, 20),
(DATE_SUB(NOW(), INTERVAL 2 DAY), 18, 500, 4.9, 15),
(DATE_SUB(NOW(), INTERVAL 1 DAY), 14, 430, 3.5, 35);
