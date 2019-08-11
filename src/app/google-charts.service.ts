/// <reference types="google.visualization" />
import { Injectable, Type } from '@angular/core';
import { Observable } from 'rxjs';
import { GoogleCharts } from 'google-charts';

export interface GoogleVis {
  Timeline: Type<google.visualization.Timeline>;
  DataTable: Type<google.visualization.DataTable>;
  events: any;
}

@Injectable({
  providedIn: 'root',
})
export class GoogleChartsService {
  constructor() {}

  public getVisualisation(...withPackages: string[]): Observable<GoogleVis> {
    return new Observable(observer => {
      // Load the charts library with a callback
      GoogleCharts.load(() => {
        GoogleCharts.api.charts.load('current', { packages: withPackages });
        GoogleCharts.api.charts.setOnLoadCallback(() => {
          observer.next(GoogleCharts.api.visualization);
          observer.complete();
        });
      });
    });
  }
}
