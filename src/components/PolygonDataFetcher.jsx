import React, { useState } from 'react';
import axios from 'axios';

const PolygonDataFetcher = ({ setApiData }) => {
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    indicesTicker: '',
    multiplier: '1',
    timespan: 'day',
    from: '',
    to: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const fetchData = async () => {
    try {
      const { indicesTicker, multiplier, timespan, from, to } = formData;
      const apiKey = process.env.REACT_APP_POLYGON_API_KEY;
      const url = `https://api.polygon.io/v2/aggs/ticker/I:${indicesTicker}/range/${multiplier}/${timespan}/${from}/${to}?sort=asc&apiKey=${apiKey}`;
      console.log('Request URL:', url);

      const response = await axios.get(url);
      console.log('Response:', response);
      if (response.status !== 200) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      setApiData(response.data);
    } catch (error) {
      setError(error.message);
      console.error('Error fetching data:', error);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Polygon.io API Data</h2>
      <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="space-y-4">
        <input
          name="indicesTicker"
          placeholder="Indices Ticker (e.g., NDX)"
          value={formData.indicesTicker}
          onChange={handleChange}
          required
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Enter the ticker symbol for the index (e.g., NDX for NASDAQ 100)"
        />
        <select
          name="multiplier"
          value={formData.multiplier}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Select the multiplier for the data aggregation"
        >
          <option value="1">1 (Daily)</option>
          <option value="5">5 (Five-Minute)</option>
          <option value="7">7 (Weekly)</option>
          <option value="30">30 (Monthly)</option>
        </select>
        <select
          name="timespan"
          value={formData.timespan}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Select the timespan for the data"
        >
          <option value="minute">Minute</option>
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>
        <input
          type="date"
          name="from"
          placeholder="From Date"
          value={formData.from}
          onChange={handleChange}
          required
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Enter the start date for the data range (YYYY-MM-DD)"
        />
        <input
          type="date"
          name="to"
          placeholder="To Date"
          value={formData.to}
          onChange={handleChange}
          required
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Enter the end date for the data range (YYYY-MM-DD)"
        />
        <button
          type="submit"
          className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition-colors"
        >
          Fetch Data
        </button>
      </form>
      {error ? <p className="text-red-500 mt-4">Error: {error}</p> : null}
    </div>
  );
};

export default PolygonDataFetcher;
