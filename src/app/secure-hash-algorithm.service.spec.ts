import { TestBed } from '@angular/core/testing';

import { SecureHashAlgorithmService } from './secure-hash-algorithm.service';

describe('SecureHashAlgorithmService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SecureHashAlgorithmService = TestBed.get(SecureHashAlgorithmService);
    expect(service).toBeTruthy();
  });
});
