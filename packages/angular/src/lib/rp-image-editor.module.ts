import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RpImageEditorComponent } from './rp-image-editor.component';
import { RpImageEditorService } from './rp-image-editor.service';

@NgModule({
  declarations: [RpImageEditorComponent],
  imports: [CommonModule],
  exports: [RpImageEditorComponent],
  providers: [RpImageEditorService],
})
export class RpImageEditorModule {
  /**
   * Use forRoot() if you want to provide the service at root level
   * (optional — service is already providedIn: 'root')
   */
  static forRoot(): ModuleWithProviders<RpImageEditorModule> {
    return {
      ngModule: RpImageEditorModule,
      providers: [RpImageEditorService],
    };
  }
}
