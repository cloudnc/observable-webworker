import { Component } from '@angular/core';
import { SecureHashAlgorithmService } from './secure-hash-algorithm.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(private secureHashAlgorithmService: SecureHashAlgorithmService) {}

  public calculateSha256($event): void {
    const file: File = $event.target.files[0];

    this.secureHashAlgorithmService.hashFile(file).subscribe();
  }
}
