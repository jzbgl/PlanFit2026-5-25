import { useState, useEffect } from 'react';

interface WeatherData {
  temp: string;
  condition: string;
  icon: string;
  humidity: string;
  wind: string;
}

const WEATHER_SUGGESTIONS: Record<string, string> = {
  Sunny: '晴天适合户外跑步或骑行，记得防晒',
  Clear: '天气晴朗，适合户外运动',
  'Partly cloudy': '多云天气，适合户外力量训练',
  Cloudy: '阴天适合室内器械训练',
  Overcast: '阴天，建议室内训练',
  Rain: '下雨天适合室内核心训练',
  'Light rain': '小雨天，建议室内HIIT',
  'Moderate rain': '有雨，今天在室内训练吧',
  'Heavy rain': '暴雨天，安全第一，在家做拉伸',
  Snow: '下雪天注意保暖，室内训练更安全',
  Mist: '雾天建议室内训练',
  Fog: '大雾天气，室内训练更佳',
  Thunder: '雷雨天不宜户外运动，室内燃脂',
};

function getSuggestion(condition: string): string {
  for (const [key, text] of Object.entries(WEATHER_SUGGESTIONS)) {
    if (condition.includes(key)) return text;
  }
  return '今天也要记得运动哦！';
}

export default function WeatherPanel() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('Beijing');
  const [cityInput, setCityInput] = useState('');

  async function fetchWeather(cityName: string) {
    setLoading(true);
    try {
      const res = await fetch(`https://wttr.in/${encodeURIComponent(cityName)}?format=j1`);
      const data = await res.json();
      const today = data.current_condition[0];
      setWeather({
        temp: today.temp_C,
        condition: today.weatherDesc[0].value,
        icon: today.weatherDesc[0].value,
        humidity: today.humidity,
        wind: today.windspeedKmph,
      });
    } catch {
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWeather(city);
  }, []);

  function handleCitySubmit() {
    if (cityInput.trim()) {
      setCity(cityInput.trim());
      fetchWeather(cityInput.trim());
      setCityInput('');
    }
  }

  return (
    <div className="rounded-xl p-5 mt-5" style={{ backgroundColor: 'var(--color-card)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          🌤 今日天气 · {city}
        </h3>
        <div className="flex items-center gap-1">
          <input
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCitySubmit()}
            className="px-2 py-1 rounded text-xs border outline-none w-24"
            style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            placeholder="城市"
          />
          <button
            onClick={handleCitySubmit}
            className="px-2 py-1 rounded text-xs"
            style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}
          >
            查
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>加载天气中...</p>
      ) : weather ? (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>{weather.temp}°C</span>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{weather.condition}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                湿度 {weather.humidity}% · 风速 {weather.wind}km/h
              </div>
            </div>
          </div>
          <div
            className="rounded-lg p-3 text-xs leading-relaxed"
            style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
          >
            💡 {getSuggestion(weather.condition)}
          </div>
        </div>
      ) : (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>无法获取天气数据</p>
      )}
    </div>
  );
}
