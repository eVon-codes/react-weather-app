import { useState } from "react";
import axios from "axios";
import "./App.css";

function getDailyForecast(data) {
  const dailyData = {};
  const timezoneOffset = data.city.timezone;

  const today = new Date(Date.now() + timezoneOffset * 1000)
    .toISOString()
    .split("T")[0];

  data.list.forEach((item) => {
    const date = new Date((item.dt + timezoneOffset) * 1000)
      .toISOString()
      .split("T")[0];

    if (date === today) {
      return;
    }

    if (!dailyData[date]) {
      dailyData[date] = {
        date,
        minTemp: item.main.temp_min,
        maxTemp: item.main.temp_max,
        icon: item.weather[0].icon,
        description: item.weather[0].description,
        iconHour: -1,
      };
    }

    dailyData[date].minTemp = Math.min(
      dailyData[date].minTemp,
      item.main.temp_min
    );

    dailyData[date].maxTemp = Math.max(
      dailyData[date].maxTemp,
      item.main.temp_max
    );

    const localHour = new Date((item.dt + timezoneOffset) * 1000).getUTCHours();

    if (
      dailyData[date].iconHour === -1 ||
      Math.abs(localHour - 12) < Math.abs(dailyData[date].iconHour - 12)
    ) {
      dailyData[date].icon = item.weather[0].icon;
      dailyData[date].description = item.weather[0].description;
      dailyData[date].iconHour = localHour;
    }
  });

  return Object.values(dailyData).slice(0, 5);
}

function formatDay(dateString) {
  return new Date(`${dateString}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

export default function App() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

  function handleCityChange(event) {
    setCity(event.target.value);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const cityName = city.trim();

    if (!cityName) {
      setError("Please enter a city name.");
      return;
    }

    if (cityName.length > 100) {
      setError("City name is too long.");
      return;
    }

    setLoading(true);
    setError("");
    setWeather(null);
    setForecast([]);

    try {
      const weatherUrl = "https://api.openweathermap.org/data/2.5/weather";

      const forecastUrl = "https://api.openweathermap.org/data/2.5/forecast";

      const params = {
        q: cityName,
        appid: apiKey,
        units: "metric",
      };

      const [weatherResponse, forecastResponse] = await Promise.all([
        axios.get(weatherUrl, { params }),
        axios.get(forecastUrl, { params }),
      ]);

      setWeather(weatherResponse.data);
      setForecast(getDailyForecast(forecastResponse.data));
    } catch (err) {
      if (err.response?.status === 404) {
        setError("City not found. Please try another city.");
      } else if (err.response?.status === 401) {
        setError("Invalid API key. Please check your API configuration.");
      } else if (err.response?.status === 429) {
        setError("Too many requests. Please try again later.");
      } else {
        setError("Unable to fetch weather. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="weather-container">
      <div className="weather-card">
        <h1 className="app-title">🌤️ Weather App</h1>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="search-form">
          <input
            type="text"
            placeholder="Enter a city..."
            value={city}
            onChange={handleCityChange}
            aria-label="City name"
            maxLength={101}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {/* Error message */}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        {/* Loading message */}
        {loading && <p className="loading-message">Loading weather data...</p>}

        {/* Current weather */}
        {weather && (
          <>
            <div className="weather-details">
              <div className="weather-info">
                <h2>
                  {weather.name}, {weather.sys.country}
                </h2>

                <p className="weather-description">
                  {weather.weather[0].description}
                </p>

                <p>
                  Humidity: <span>{weather.main.humidity}%</span>
                </p>

                <p>
                  Wind:{" "}
                  <span>{(weather.wind.speed * 3.6).toFixed(1)} km/h</span>
                </p>
              </div>

              {/* Original weather icon */}
              <div className="temperature">
                <img
                  src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
                  alt={weather.weather[0].description}
                />

                <strong>{Math.round(weather.main.temp)}</strong>

                <span>°C</span>
              </div>
            </div>

            {/* Five-day forecast */}
            {forecast.length > 0 && (
              <div className="forecast">
                <h3>5-Day Forecast</h3>

                <div className="forecast-container">
                  {forecast.map((day) => (
                    <div className="forecast-day" key={day.date}>
                      <p>{formatDay(day.date)}</p>

                      <img
                        src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
                        alt={day.description}
                      />

                      <div className="forecast-temperatures">
                        <strong>{Math.round(day.maxTemp)}°</strong>

                        <span>{Math.round(day.minTemp)}°</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <footer>
          This project was coded with React and powered by OpenWeather.
        </footer>
      </div>
    </div>
  );
}
