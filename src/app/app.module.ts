import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { SingleWorkerComponent } from './single-worker/single-worker.component';
import { MultipleWorkerPoolComponent } from './multiple-worker-pool/multiple-worker-pool.component';
import { LogLineComponent } from './multiple-worker-pool/log-line/log-line.component';

@NgModule({
  declarations: [AppComponent, SingleWorkerComponent, MultipleWorkerPoolComponent, LogLineComponent],
  imports: [BrowserModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
