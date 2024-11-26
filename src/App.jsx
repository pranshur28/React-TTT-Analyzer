import React, { useState } from 'react';
import TaylorPatternAnalyzer from './components/TaylorPatternAnalyzer';
import PolygonDataFetcher from './components/PolygonDataFetcher';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import Navbar from './components/ui/Navbar';

const App = () => {
  const [apiData, setApiData] = useState(null);

  return (
    <div>
      <Navbar />
      <div className="space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Polygon Data Fetcher</CardTitle>
          </CardHeader>
          <CardContent>
            <PolygonDataFetcher setApiData={setApiData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Taylor Pattern Analyzer</CardTitle>
          </CardHeader>
          <CardContent>
            <TaylorPatternAnalyzer apiData={apiData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default App;
