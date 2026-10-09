import { render, screen } from '@testing-library/react';
import App from './App';

it('mostra o nome da app', () => {
  render(<App />);
  expect(screen.getByText('App Júris')).toBeInTheDocument();
});
