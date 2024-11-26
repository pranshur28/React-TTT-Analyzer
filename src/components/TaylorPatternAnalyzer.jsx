import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Upload, Info, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';

const TaylorPatternAnalyzer = () => {
  const [priceData, setPriceData] = useState([]);
  const [rthData, setRthData] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  // Define regular trading hours windows - adjusted for daylight savings
  const timeWindows = {
    opening: { start: '08:30', end: '09:30', name: 'Opening Hour' },
    midDay: { start: '09:30', end: '13:30', name: 'Mid-Day' },
    closing: { start: '13:30', end: '15:00', name: 'Closing Hour' }
  };

  const isInRegularHours = (timeStr) => {
    try {
      const time = timeStr.replace(/"/g, '').split(' ')[1];
      const [hours, minutes] = time.split(':').map(Number);
      return (hours >= 8 && hours <= 15) && 
             (hours !== 8 || minutes >= 30) && 
             (hours !== 15 || minutes === 0);
    } catch (e) {
      return false;
    }
  };

  const calculateMovingAverage = (data, windowSize) => {
    const movingAverages = [];
    for (let i = 0; i <= data.length - windowSize; i++) {
      const windowData = data.slice(i, i + windowSize);
      const average = windowData.reduce((sum, row) => sum + parseFloat(row.Last), 0) / windowSize;
      movingAverages.push(average);
    }
    return movingAverages;
  };

  const analyzeData = (data) => {
    if (!data || data.length < 8) return null;

    const rthPrices = data.filter(row => isInRegularHours(row.Time));
    const windowAnalysis = {};

    Object.entries(timeWindows).forEach(([key, window]) => {
      const windowData = rthPrices.filter(row => {
        const time = row.Time.replace(/"/g, '').split(' ')[1];
        return time >= window.start && time <= window.end;
      });

      if (windowData.length > 0) {
        const highs = windowData.map(row => parseFloat(row.High));
        const lows = windowData.map(row => parseFloat(row.Low));
        windowAnalysis[key] = {
          high: Math.max(...highs),
          low: Math.min(...lows),
          highTime: windowData.find(row => parseFloat(row.High) === Math.max(...highs))?.Time,
          lowTime: windowData.find(row => parseFloat(row.Low) === Math.min(...lows))?.Time,
          volume: windowData.reduce((sum, row) => sum + parseInt(row.Volume), 0)
        };
      }
    });

    const high = Math.max(...rthPrices.map(d => parseFloat(d.High)));
    const low = Math.min(...rthPrices.map(d => parseFloat(d.Low)));
    const open = parseFloat(rthPrices[0]?.Open || 0);
    const close = parseFloat(rthPrices[rthPrices.length - 1]?.Last || 0);
    const range = high - low;

    const shortTermMA = calculateMovingAverage(rthPrices, 5);
    const longTermMA = calculateMovingAverage(rthPrices, 20);

    const patterns = {
      buyDay: {
        match: windowAnalysis.opening.low === low && close > (high - range * 0.3),
        confidence: 0,
        characteristics: [
          'Low typically made in first hour',
          'Rally following the low',
          'Strong close relative to range',
          'Volume increases on rally'
        ]
      },
      sellDay: {
        match: windowAnalysis.midDay.high === high && close < (high - range * 0.5),
        confidence: 0,
        characteristics: [
          'High made mid-session',
          'Decline from high',
          'Weak close',
          'Volume highest on highs'
        ]
      },
      shortSaleDay: {
        match: windowAnalysis.opening.high === high && close < (high - range * 0.7),
        confidence: 0,
        characteristics: [
          'High made in first hour',
          'Steady decline after high',
          'Weak close',
          'Volume decreases after high'
        ]
      }
    };

    Object.keys(patterns).forEach(pattern => {
      let score = 0;
      if (pattern === 'buyDay') {
        if (windowAnalysis.opening.low === low) score += 40;
        if (close > open) score += 20;
        if (close > (high - range * 0.3)) score += 20;
        if (windowAnalysis.opening.volume > windowAnalysis.midDay.volume) score += 20;
        if (shortTermMA[shortTermMA.length - 1] > longTermMA[longTermMA.length - 1]) score += 10;
      } else if (pattern === 'sellDay') {
        if (windowAnalysis.midDay.high === high) score += 40;
        if (close < open) score += 20;
        if (close < (high - range * 0.5)) score += 20;
        if (windowAnalysis.midDay.volume > windowAnalysis.closing.volume) score += 20;
        if (shortTermMA[shortTermMA.length - 1] < longTermMA[longTermMA.length - 1]) score += 10;
      } else if (pattern === 'shortSaleDay') {
        if (windowAnalysis.opening.high === high) score += 40;
        if (close < open) score += 20;
        if (close < (high - range * 0.7)) score += 20;
        if (windowAnalysis.closing.volume < windowAnalysis.opening.volume) score += 20;
        if (shortTermMA[shortTermMA.length - 1] < longTermMA[longTermMA.length - 1]) score += 10;
      }
      patterns[pattern].confidence = score;
    });

    return {
      metrics: {
        open,
        high,
        low,
        close,
        range: range.toFixed(2),
        volume: rthPrices.reduce((sum, row) => sum + parseInt(row.Volume), 0)
      },
      windows: windowAnalysis,
      patterns,
      indicators: {
        shortTermMA: shortTermMA[shortTermMA.length - 1],
        longTermMA: longTermMA[longTermMA.length - 1]
      }
    };
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || !results.data.length) {
          setError("No valid data found");
          return;
        }

        try {
          const validData = results.data
            .filter(row => 
              row.Time && 
              row.High && 
              row.Low && 
              row.Last && 
              row.Volume && 
              !row.Time.includes("Downloaded from"))
            .sort((a, b) => {
              const dateA = new Date(a.Time.replace(/"/g, ''));
              const dateB = new Date(b.Time.replace(/"/g, ''));
              return dateA - dateB;
            });

          if (validData.some(row => !row.Open || !row.High || !row.Low || !row.Last || !row.Volume)) {
            setError("Missing required data fields");
            return;
          }

          const times = validData.slice(0, 10).map(row => {
            const time = new Date(row.Time.replace(/"/g, ''));
            return time.getHours() * 60 + time.getMinutes();
          });
          
          const intervals = [];
          for (let i = 1; i < times.length; i++) {
            const diff = Math.abs(times[i] - times[i-1]);
            if (diff > 0) intervals.push(diff);
          }
          
          const avgInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
          
          if (avgInterval !== 5) {
            setError("Please provide 5-minute interval data for accurate analysis");
            return;
          }

          setPriceData(validData);
          const rthData = validData.filter(row => isInRegularHours(row.Time));
          setRthData(rthData);
          const analysisResult = analyzeData(validData);
          setAnalysis(analysisResult);
          setError(null);
        } catch (e) {
          setError(`Error processing data: ${e.message}`);
        }
      },
      error: (error) => {
        setError(`Error parsing file: ${error.message}`);
      }
    });
  };

  const formatChartData = (data) => {
    return data.map(row => ({
      time: row.Time.replace(/"/g, '').split(' ')[1],
      high: parseFloat(row.High),
      low: parseFloat(row.Low),
      last: parseFloat(row.Last),
      volume: parseInt(row.Volume)
    }));
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Taylor Trading Pattern Analyzer
          <Info className="h-5 w-5 text-gray-500" />
        </CardTitle>
        <div className="text-sm text-gray-500">
          Upload 5-minute OHLCV data for pattern analysis
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* File Upload */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 w-fit mx-auto">
              <Upload className="h-5 w-5 text-blue-500" />
              <span className="text-blue-600">Upload CSV File</span>
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".csv"
                className="hidden"
              />
            </label>
            <div className="text-sm text-gray-500 text-center">
              Required format: Time,Open,High,Low,Last,Volume (5-minute intervals)
            </div>
          </div>

          {error && (
            <div className="bg-red-50 p-4 rounded-lg flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {analysis && (
            <>
              {/* Price Chart */}
              <div className="h-96">
                <ResponsiveContainer>
                  <LineChart data={formatChartData(rthData)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      interval="preserveStartEnd"
                    />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="high" 
                      stroke="#22c55e" 
                      dot={false}
                      name="High"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="low" 
                      stroke="#ef4444" 
                      dot={false}
                      name="Low"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="last" 
                      stroke="#3b82f6" 
                      dot={false}
                      name="Last"
                    />
                    {Object.entries(analysis.windows).map(([key, window]) => (
                      <React.Fragment key={key}>
                        <ReferenceLine 
                          y={window.high} 
                          stroke="#22c55e" 
                          strokeDasharray="3 3" 
                        />
                        <ReferenceLine 
                          y={window.low} 
                          stroke="#ef4444" 
                          strokeDasharray="3 3" 
                        />
                      </React.Fragment>
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Pattern Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(analysis.patterns).map(([type, pattern]) => (
                  <div 
                    key={type}
                    className={`p-4 rounded-lg ${
                      pattern.confidence > 70 ? 'bg-green-50 border-green-200' :
                      pattern.confidence > 40 ? 'bg-yellow-50 border-yellow-200' :
                      'bg-gray-50 border-gray-200'
                    } border`}
                  >
                    <h3 className="font-bold mb-2 capitalize">{type.replace('Day', ' Day')}</h3>
                    <div className="mb-2">
                      <div className="text-sm font-semibold">Confidence Score:</div>
                      <div className="text-2xl font-bold">{pattern.confidence}%</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-semibold">Characteristics:</div>
                      <ul className="text-sm space-y-1">
                        {pattern.characteristics.map((char, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className={pattern.match ? 'text-green-500' : 'text-gray-400'}>
                              {pattern.match ? '✓' : '○'}
                            </span>
                            {char}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trade Plan for Next Day */}
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  Next Day Trade Plan
                  <Info className="h-4 w-4 text-gray-500" />
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Setup Type: {
                      Object.entries(analysis.patterns)
                        .reduce((a, b) => a[1].confidence > b[1].confidence ? a : b)[0]
                        .replace('Day', ' Day')
                    }</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-semibold mb-1">Key Price Levels:</div>
                        <ul className="text-sm space-y-1 list-disc pl-4">
                          <li>Previous High: {analysis.metrics.high}</li>
                          <li>Previous Low: {analysis.metrics.low}</li>
                          <li>Previous Close: {analysis.metrics.close}</li>
                        </ul>
                      </div>
                      <div>
                        <div className="text-sm font-semibold mb-1">Entry Zones:</div>
                        <ul className="text-sm space-y-1 list-disc pl-4">
                          {(() => {
                            const bestPattern = Object.entries(analysis.patterns)
                              .reduce((a, b) => a[1].confidence > b[1].confidence ? a : b)[0];
                            const range = analysis.metrics.high - analysis.metrics.low;
                            
                            switch(bestPattern) {
                              case 'buyDay':
                                return (
                                  <>
                                    <li>Primary Buy Zone: {(analysis.metrics.low - range * 0.01).toFixed(2)} to {analysis.metrics.low}</li>
                                    <li>Secondary Buy Zone: {(analysis.metrics.low + range * 0.01).toFixed(2)} to {(analysis.metrics.low + range * 0.03).toFixed(2)}</li>
                                    <li>Stop Loss: Below {(analysis.metrics.low - range * 0.02).toFixed(2)}</li>
                                  </>
                                );
                              case 'sellDay':
                                return (
                                  <>
                                    <li>Primary Sell Zone: {analysis.metrics.high} to {(analysis.metrics.high + range * 0.01).toFixed(2)}</li>
                                    <li>Secondary Sell Zone: {(analysis.metrics.high - range * 0.02).toFixed(2)} to {analysis.metrics.high}</li>
                                    <li>Stop Loss: Above {(analysis.metrics.high + range * 0.02).toFixed(2)}</li>
                                  </>
                                );
                              case 'shortSaleDay':
                                return (
                                  <>
                                    <li>Primary Short Zone: {analysis.metrics.high} to {(analysis.metrics.high + range * 0.01).toFixed(2)}</li>
                                    <li>Secondary Short Zone: {(analysis.metrics.high - range * 0.02).toFixed(2)} to {analysis.metrics.high}</li>
                                    <li>Stop Loss: Above {(analysis.metrics.high + range * 0.02).toFixed(2)}</li>
                                  </>
                                );
                              default:
                                return <li>No clear entry zones identified</li>;
                            }
                          })()}
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Trading Instructions</h4>
                    {(() => {
                      const bestPattern = Object.entries(analysis.patterns)
                        .reduce((a, b) => a[1].confidence > b[1].confidence ? a : b)[0];
                      
                      switch(bestPattern) {
                        case 'buyDay':
                          return (
                            <ol className="text-sm space-y-2 list-decimal pl-4">
                              <li>Watch for early weakness in first hour</li>
                              <li>Look for support near previous day's low</li>
                              <li>Enter long positions when price stabilizes in buy zones</li>
                              <li>Add to position if higher low forms</li>
                              <li>Take profits at previous day's high</li>
                              <li>Exit all positions before close if rally fails</li>
                            </ol>
                          );
                        case 'sellDay':
                          return (
                            <ol className="text-sm space-y-2 list-decimal pl-4">
                              <li>Watch for early strength</li>
                              <li>Look for resistance near previous day's high</li>
                              <li>Exit/reverse longs in sell zones</li>
                              <li>Protect profits with trailing stops</li>
                              <li>Be prepared for afternoon weakness</li>
                              <li>Cover shorts if strong support emerges</li>
                            </ol>
                          );
                        case 'shortSaleDay':
                          return (
                            <ol className="text-sm space-y-2 list-decimal pl-4">
                              <li>Watch for early strength to fade</li>
                              <li>Enter shorts in designated zones</li>
                              <li>Add to shorts if lower highs form</li>
                              <li>Trail stops as price declines</li>
                              <li>Take profits at previous day's low</li>
                              <li>Cover all shorts if strong rally emerges</li>
                            </ol>
                          );
                        default:
                          return (
                            <p className="text-sm text-gray-600">
                              No clear pattern detected. Consider waiting for better setup.
                            </p>
                          );
                      }
                    })()}
                    
                    <div className="mt-4">
                      <div className="text-sm font-semibold mb-1">Volume Considerations:</div>
                      <ul className="text-sm space-y-1 list-disc pl-4">
                        <li>Previous day volume: {analysis.metrics.volume.toLocaleString()} contracts</li>
                        <li>Watch for volume expansion in entry zones</li>
                        <li>Heavy volume at extremes may signal reversal</li>
                        <li>Light volume rallies often fail</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
                  <div className="font-semibold mb-1">Risk Management Rules:</div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Respect stop losses absolutely</li>
                    <li>Size positions according to risk tolerance</li>
                    <li>Don't average down on losing trades</li>
                    <li>Exit trades showing adverse volume patterns</li>
                    <li>Take partial profits when available</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TaylorPatternAnalyzer;
