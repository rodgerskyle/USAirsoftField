import { fireEvent, waitFor } from '@testing-library/react';
import { bindWaiverPicker, waiverPickerMarkup } from './staff-waiver-picker';

test('staff select a specific waiver and stale search results cannot refill the picker', async () => {
  const root = document.createElement('div');
  document.body.appendChild(root);
  root.innerHTML = waiverPickerMarkup({ name: 'Alex' });
  const controller = new AbortController();
  let finishFirst;
  const search = jest.fn().mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }))
    .mockResolvedValueOnce({ matches: [{ name: 'Alex Lee', ref: 'selected', signedAt: Date.UTC(2026, 0, 1) }] });
  const choose = jest.fn();
  bindWaiverPicker(root, {signal: controller.signal, search, onChoose: choose});
  const field = root.querySelector('input');
  fireEvent.click(root.querySelector('[data-waiver-find]'));
  fireEvent.input(field, {target: {value: 'Alex Lee'}});
  fireEvent.keyDown(field, {key: 'Enter'});
  await waitFor(() => expect(root.querySelector('[data-waiver-choice]')).toBeInTheDocument());
  finishFirst({matches: [{name: 'Alex Lane', ref: 'stale'}]});
  await Promise.resolve();
  expect(root.textContent).not.toContain('Alex Lane');
  expect(choose).not.toHaveBeenCalled();
  fireEvent.click(root.querySelector('[data-waiver-choice]'));
  expect(choose.mock.calls[0][0].ref).toBe('selected');
  controller.abort();
  root.remove();
});
