import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LogLineComponent } from './log-line.component';

describe('LogLineComponent', () => {
  let component: LogLineComponent;
  let fixture: ComponentFixture<LogLineComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [LogLineComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LogLineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
