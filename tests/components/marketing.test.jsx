/**
 * Smoke test for the marketing shell primitives used on the landing page.
 * Kept intentionally small: these components are prop-driven and stateless
 * except FeatureCard, whose expansion toggle is the only interactive behaviour.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SectionHeading from '../../components/SectionHeading';
import Button from '../../components/Button';
import FeatureCard from '../../components/FeatureCard';

describe('SectionHeading', () => {
  it('renders the plain and highlighted text plus a subtitle', () => {
    const { container } = render(
      <SectionHeading text="Our " highlightedText="features" subtitle="Why Solaira" />
    );

    const heading = container.querySelector('h2');
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toContain('Our');
    expect(heading.textContent).toContain('features');
    expect(screen.getByText('Why Solaira')).toBeInTheDocument();
  });

  it('omits the subtitle when not provided', () => {
    const { container } = render(<SectionHeading text="Only" />);
    expect(container.querySelector('p')).toBeNull();
  });
});

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Contact</Button>);
    expect(screen.getByText('Contact')).toBeInTheDocument();
  });

  it('renders an anchor when an href is provided', () => {
    render(<Button href="/pricing">Pricing</Button>);
    expect(screen.getByText('Pricing').closest('a')).toHaveAttribute('href', '/pricing');
  });

  it('fires onClick', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Go</Button>);

    await userEvent.click(screen.getByText('Go'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('FeatureCard', () => {
  const props = {
    title: 'Battery storage',
    description: 'Store solar energy for the night.',
    image: '/pv-home.png',
    iconColor: '#00D9A3',
  };

  it('shows the title and description', () => {
    render(<FeatureCard {...props} />);
    expect(screen.getByText('Battery storage')).toBeInTheDocument();
    expect(screen.getByText('Store solar energy for the night.')).toBeInTheDocument();
  });

  it('toggles its expanded state when clicked', async () => {
    const { container } = render(<FeatureCard {...props} />);

    const card = container.firstChild;
    const expandToggle = container.querySelector('[aria-label="Expand"]');
    expect(expandToggle).toBeInTheDocument();

    await userEvent.click(card);
    expect(container.querySelector('[aria-label="Collapse"]')).toBeInTheDocument();

    await userEvent.click(card);
    expect(container.querySelector('[aria-label="Expand"]')).toBeInTheDocument();
  });
});
