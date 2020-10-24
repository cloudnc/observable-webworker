import { async, ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SingleWorkerComponent } from './single-worker.component';

describe('SingleWorkerComponent', () => {
  let component: SingleWorkerComponent;
  let fixture: ComponentFixture<SingleWorkerComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [SingleWorkerComponent],
      }).compileComponents();
    }),
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(SingleWorkerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
