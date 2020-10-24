import { async, ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LogLineComponent } from './log-line.component';

describe('LogLineComponent', () => {
  let component: LogLineComponent;
  let fixture: ComponentFixture<LogLineComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [LogLineComponent],
      }).compileComponents();
    }),
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(LogLineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
