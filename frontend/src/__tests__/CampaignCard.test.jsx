import { render, screen } from '@testing-library/react';
import CampaignCard from '../components/campaigns/CampaignCard';
import { CurrencyProvider } from '../context/CurrencyContext';

const renderWithCurrency = (ui) => {
  return render(<CurrencyProvider>{ui}</CurrencyProvider>);
};

describe('CampaignCard', () => {
  it('renders title and progress', () => {
    const campaign = {
      _id: '1',
      slug: 'test-campaign',
      title: 'Test Campaign',
      description: 'Short description',
      coverImage: '',
      category: 'community',
      raisedAmount: 50,
      targetAmount: 100,
      currency: 'USD',
      donorCount: 10,
      daysLeft: 5,
      progressPercentage: 50
    };

    renderWithCurrency(<CampaignCard campaign={campaign} />);

    expect(screen.getByText('Test Campaign')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});

