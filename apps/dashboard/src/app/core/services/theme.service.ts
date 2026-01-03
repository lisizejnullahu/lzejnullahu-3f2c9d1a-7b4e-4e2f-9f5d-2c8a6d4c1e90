import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private darkModeSubject = new BehaviorSubject<boolean>(this.getInitialTheme())
  public darkMode$ = this.darkModeSubject.asObservable()

  constructor() {
    this.applyTheme(this.darkModeSubject.value)
  }

  private getInitialTheme(): boolean {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) {
      return saved === 'true'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  toggleTheme(): void {
    const newValue = !this.darkModeSubject.value
    this.darkModeSubject.next(newValue)
    this.applyTheme(newValue)
    localStorage.setItem('darkMode', String(newValue))
  }

  private applyTheme(isDark: boolean): void {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  isDarkMode(): boolean {
    return this.darkModeSubject.value
  }
}
