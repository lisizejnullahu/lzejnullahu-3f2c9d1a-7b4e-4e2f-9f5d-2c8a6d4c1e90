import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { AuthService } from '../../../core/services/auth.service'

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  email = 'owner@demo'
  password = 'Password123!'
  errorMessage = ''
  isLoading = false

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter email and password'
      return
    }

    this.isLoading = true
    this.errorMessage = ''

    this.authService
      .login({ email: this.email, password: this.password })
      .subscribe({
        next: (response) => {
          this.router.navigate(['/dashboard'])
        },
        error: (error) => {
          this.errorMessage =
            error.error?.message || 'Invalid email or password'
          this.isLoading = false
        },
      })
  }
}
