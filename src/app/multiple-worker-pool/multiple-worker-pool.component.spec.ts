import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MultipleWorkerPoolComponent } from './multiple-worker-pool.component';

describe('MultipleWorkerPoolComponent', () => {
  let component: MultipleWorkerPoolComponent;
  let fixture: ComponentFixture<MultipleWorkerPoolComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MultipleWorkerPoolComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MultipleWorkerPoolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
