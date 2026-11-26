import { TestBed } from '@angular/core/testing';
import { ThemeStore } from './theme.store';

describe('ThemeStore', () => {
  it('toggles between light and dark modes deterministically', () => {
    TestBed.configureTestingModule({ providers: [ThemeStore] });
    const store = TestBed.inject(ThemeStore);
    const initialDark = store.isDark();

    store.toggle();
    expect(store.isDark()).toBe(!initialDark);

    store.toggle();
    expect(store.isDark()).toBe(initialDark);
  });
});
