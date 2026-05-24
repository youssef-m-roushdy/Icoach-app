import { Directive, Input, TemplateRef, ViewContainerRef, inject, OnInit } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Directive({ selector: '[appHasRole]', standalone: true })
export class HasRoleDirective implements OnInit {
  @Input('appHasRole') role!: string;
  private tpl = inject(TemplateRef);
  private vcr = inject(ViewContainerRef);
  private auth = inject(AuthService);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user?.role === this.role) this.vcr.createEmbeddedView(this.tpl);
  }
}
