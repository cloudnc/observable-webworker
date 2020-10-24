import { async, ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MultipleWorkerPoolComponent } from './multiple-worker-pool.component';

describe('MultipleWorkerPoolComponent', () => {
  let component: MultipleWorkerPoolComponent;
  let fixture: ComponentFixture<MultipleWorkerPoolComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [MultipleWorkerPoolComponent],
      }).compileComponents();
    }),
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(MultipleWorkerPoolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
