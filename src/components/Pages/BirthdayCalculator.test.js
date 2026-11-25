import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Pricing from './Pricing';
import Contact from './Contact';
import catalogue from '../../../public/field-resources.json';
import useFieldResources from '../constants/useFieldResources';

jest.mock('../constants/useFieldResources');
jest.mock('./GoogleMap', () => () => null);

function show(url) {
    useFieldResources.mockReturnValue({ resources: catalogue });
    render(<HelmetProvider><MemoryRouter initialEntries={[url]}><Routes>
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
    </Routes></MemoryRouter></HelmetProvider>);
}

test('a family calculates a weekend party and opens an inquiry with their package, total and headcount', () => {
    show('/pricing');
    fireEvent.click(screen.getByRole('button', { name: 'Parties' }));
    const count = screen.getByLabelText('Number of players');
    expect(screen.getByRole('combobox', { name: 'Package' })).toHaveValue('Weekend Package #2');
    fireEvent.change(count, { target: { value: '0' } });
    expect(screen.queryByRole('link', { name: 'Request this party' })).toBeNull();
    fireEvent.change(count, { target: { value: '12' } });
    expect(screen.getByText('Estimated total $600')).toBeVisible();
    expect(screen.getByText('$500 package + 2 additional players × $50')).toBeVisible();
    fireEvent.click(screen.getByRole('link', { name: 'Request this party' }));
    fireEvent.change(screen.getByLabelText('Preferred date (optional)'), { target: { value: '2030-07-20' } });
    const draft = new URL(screen.getByRole('link', { name: 'Open email with booking request' }).href);
    expect(draft.protocol).toBe('mailto:');
    expect(draft.searchParams.get('body')).toContain('Weekend Package #2 with 12 players');
    expect(draft.searchParams.get('body')).toContain('2030-07-20');
    expect(draft.searchParams.get('body')).toContain('$600');
});

test('direct booking URLs use trusted current package prices, and validate party identity and count', () => {
    show('/contact?party=Invented+Offer&players=12&total=2');
    expect(screen.getByRole('link', { name: 'choose your party package' })).toHaveAttribute('href', '/pricing?section=parties');
    expect(screen.queryByRole('link', { name: 'Open email with booking request' })).toBeNull();
});
