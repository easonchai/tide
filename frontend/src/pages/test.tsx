import React from 'react';
import styles from '../styles/Chart.module.css';
import PriceLineChart from '../components/PriceLineChart';

export default function TestPage(): React.ReactElement {
  return (
    <div className={styles.centerWrapper}>
      <div className={styles.chartWrapper}>
        <PriceLineChart />
      </div>
    </div>
  );
}


