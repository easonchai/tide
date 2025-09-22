import React from 'react';
import styles from '../styles/Chart.module.css';
import PriceLineChart from '../components/PriceLineChart';
import { ChartBarHorizontal } from '@/components/InteractiveChart';
import { ChartLineLinear } from '@/components/InteractiveChart2';

export default function TestPage(): React.ReactElement {
  return (
    <div className="w-full min-h-screen">
      <div className="w-full h-screen flex items-center justify-center">
        <ChartLineLinear/>
      </div>
    </div>
  );
}


