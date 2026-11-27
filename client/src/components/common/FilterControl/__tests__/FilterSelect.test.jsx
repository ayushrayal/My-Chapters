import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { FilterSelect } from '../FilterSelect.jsx';
import { FilterBar } from '../FilterBar.jsx';

describe('FilterSelect Component & Option Normalization', () => {
  // 1. Primitive string options
  it('renders and selects primitive string options cleanly', () => {
    const handleChange = vi.fn();
    const options = ['Legs', 'Chest', 'Back'];

    render(
      <FilterSelect
        label="Body Part"
        value=""
        onChange={handleChange}
        options={options}
        placeholder="All Body Parts"
      />
    );

    // Initial trigger shows placeholder
    expect(screen.getByText('All Body Parts')).toBeDefined();

    // Click trigger to open using the accessible label "Body Part"
    const trigger = screen.getByRole('button', { name: /body part/i });
    fireEvent.click(trigger);

    // All options visible
    expect(screen.getByRole('option', { name: 'Legs' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Chest' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Back' })).toBeDefined();

    // Select option
    fireEvent.click(screen.getByRole('option', { name: 'Chest' }));
    expect(handleChange).toHaveBeenCalledWith('Chest');
  });

  // 2. Primitive numeric options
  it('renders and selects primitive numeric options cleanly', () => {
    const handleChange = vi.fn();
    const options = [5, 10, 15, 20];

    render(
      <FilterSelect
        label="Count"
        value={10}
        onChange={handleChange}
        options={options}
      />
    );

    // Initial display shows selected value 10
    expect(screen.getByText('10')).toBeDefined();

    // Open and select 20
    fireEvent.click(screen.getByRole('button', { name: /count/i }));
    fireEvent.click(screen.getByRole('option', { name: '20' }));
    expect(handleChange).toHaveBeenCalledWith(20);
  });

  // 3. Object options containing name and variations (Parent workout shape from backend)
  it('renders object options with name and variations without React object-as-child crash', () => {
    const handleChange = vi.fn();
    const parentOptions = [
      {
        name: 'Pull Day',
        variations: [
          { id: 'v1', name: 'Pull Day Variation A' },
          { id: 'v2', name: 'Pull Day Variation B' }
        ]
      },
      {
        name: 'Push Day',
        variations: [
          { id: 'v3', name: 'Push Day Variation A' }
        ]
      }
    ];

    render(
      <FilterSelect
        label="Parent"
        value=""
        onChange={handleChange}
        options={parentOptions}
        placeholder="All Parents"
      />
    );

    // Trigger should render placeholder without throwing error
    expect(screen.getByText('All Parents')).toBeDefined();

    // Open options panel
    fireEvent.click(screen.getByRole('button', { name: /parent/i }));

    // Both parent names should be rendered safely as text
    expect(screen.getByRole('option', { name: 'Pull Day' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Push Day' })).toBeDefined();

    // Select Pull Day
    fireEvent.click(screen.getByRole('option', { name: 'Pull Day' }));
    expect(handleChange).toHaveBeenCalledWith('Pull Day');
  });

  // 4. Object options containing stable IDs and labels
  it('renders and selects object options containing stable IDs and labels', () => {
    const handleChange = vi.fn();
    const options = [
      { id: 'p-1', label: 'Pull Routine' },
      { id: 'p-2', label: 'Legs Routine' }
    ];

    render(
      <FilterSelect
        label="Routine"
        value="p-1"
        onChange={handleChange}
        options={options}
      />
    );

    // Shows label for selected ID
    expect(screen.getByText('Pull Routine')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /routine/i }));
    fireEvent.click(screen.getByRole('option', { name: 'Legs Routine' }));
    expect(handleChange).toHaveBeenCalledWith('p-2');
  });

  // 5. Parent workout selection
  it('properly marks selected parent workout as active even when value was passed as string or object', () => {
    const parentOptions = [
      {
        id: 'parent-pull',
        name: 'Pull Day',
        variations: [{ id: 'v1', name: 'Pull Variation A' }]
      },
      {
        id: 'parent-push',
        name: 'Push Day',
        variations: [{ id: 'v2', name: 'Push Variation A' }]
      }
    ];

    const { rerender } = render(
      <FilterSelect
        label="Parent"
        value="Pull Day"
        options={parentOptions}
      />
    );

    // Value matches by name
    expect(screen.getByText('Pull Day')).toBeDefined();

    // Re-render where value is passed as object
    rerender(
      <FilterSelect
        label="Parent"
        value={{ name: 'Push Day', id: 'parent-push' }}
        options={parentOptions}
      />
    );

    expect(screen.getByText('Push Day')).toBeDefined();
  });

  // 6. Variation selection
  it('correctly displays and selects workout variations', () => {
    const handleChange = vi.fn();
    const variationOptions = [
      { id: 'var-a', value: 'Pull Day Variation A', label: 'Pull Day Variation A' },
      { id: 'var-b', value: 'Pull Day Variation B', label: 'Pull Day Variation B' }
    ];

    render(
      <FilterSelect
        label="Routine"
        value="Pull Day Variation A"
        onChange={handleChange}
        options={variationOptions}
      />
    );

    expect(screen.getByText('Pull Day Variation A')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /routine/i }));
    fireEvent.click(screen.getByRole('option', { name: 'Pull Day Variation B' }));
    expect(handleChange).toHaveBeenCalledWith('Pull Day Variation B');
  });

  // 7. Duplicate labels with different IDs
  it('safely handles duplicate labels with different IDs without key collision warnings', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const options = [
      { id: 'uuid-1', label: 'Custom Workout', value: 'custom-1' },
      { id: 'uuid-2', label: 'Custom Workout', value: 'custom-2' }
    ];

    render(
      <FilterSelect
        label="Workout"
        value="custom-2"
        options={options}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /workout/i }));

    const buttons = screen.getAllByRole('option', { name: 'Custom Workout' });
    expect(buttons.length).toBe(2);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    const keyWarnings = consoleWarnSpy.mock.calls.filter((call) =>
      typeof call[0] === 'string' && call[0].includes('same key')
    );
    expect(keyWarnings.length).toBe(0);

    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // 8. Missing or null labels
  it('handles null, undefined, or missing labels without crashing', () => {
    const options = [
      { value: 'id-only' },
      { id: 'missing-label', name: null, label: undefined },
      null,
      undefined
    ];

    render(
      <FilterSelect
        label="Test"
        value=""
        options={options}
        placeholder="Select item..."
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /test/i }));

    // Falls back to value/id safely without crashing
    expect(screen.getByRole('option', { name: 'id-only' })).toBeDefined();
  });

  // 9. Empty option arrays
  it('renders cleanly when options array is empty or undefined', () => {
    render(
      <FilterSelect
        label="Empty"
        value=""
        options={[]}
        placeholder="None Available"
      />
    );

    expect(screen.getByText('None Available')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /empty/i }));
    expect(screen.getByText('No options found')).toBeDefined();
  });

  // 10. Changing between parent and variation filters
  it('allows changing parent filter, updating available variations without crashing', () => {
    function ParentAndVariationTest() {
      const [parent, setParent] = useState('');
      const [variation, setVariation] = useState('');

      const parentOptions = [
        {
          name: 'Pull Day',
          variations: [
            { id: 'p-a', name: 'Pull Day Variation A' },
            { id: 'p-b', name: 'Pull Day Variation B' }
          ]
        },
        {
          name: 'Push Day',
          variations: [
            { id: 'p-c', name: 'Push Day Variation A' }
          ]
        }
      ];

      const currentParent = parentOptions.find((p) => p.name === parent);
      const variationOptions = currentParent
        ? currentParent.variations.map((v) => ({ id: v.id, value: v.name, label: v.name }))
        : [];

      return (
        <FilterBar
          appliedChips={[
            parent ? { id: 'parent', label: `Parent: ${parent}`, onRemove: () => setParent('') } : null,
            variation ? { id: 'var', label: `Variation: ${variation}`, onRemove: () => setVariation('') } : null
          ].filter(Boolean)}
        >
          <FilterSelect
            label="Parent"
            value={parent}
            onChange={(val) => {
              setParent(val);
              setVariation('');
            }}
            options={parentOptions}
            placeholder="All Parents"
          />
          <FilterSelect
            label="Variation"
            value={variation}
            onChange={setVariation}
            options={variationOptions}
            placeholder="All Variations"
          />
        </FilterBar>
      );
    }

    render(<ParentAndVariationTest />);

    // 1. Initially both empty
    expect(screen.getByText('All Parents')).toBeDefined();
    expect(screen.getByText('All Variations')).toBeDefined();

    // 2. Select Pull Day
    fireEvent.click(screen.getByRole('button', { name: /^parent$/i }));
    fireEvent.click(screen.getByRole('option', { name: 'Pull Day' }));

    // Pull Day is selected and active chip appears
    expect(screen.getByText('Pull Day')).toBeDefined();
    expect(screen.getByText('Parent: Pull Day')).toBeDefined();

    // 3. Open Variation dropdown - should show Pull Day variations
    fireEvent.click(screen.getByRole('button', { name: /^variation$/i }));
    expect(screen.getByRole('option', { name: 'Pull Day Variation A' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Pull Day Variation B' })).toBeDefined();

    // 4. Select Pull Day Variation A
    fireEvent.click(screen.getByRole('option', { name: 'Pull Day Variation A' }));
    expect(screen.getByText('Variation: Pull Day Variation A')).toBeDefined();

    // 5. Change Parent to Push Day - variation is automatically cleared
    fireEvent.click(screen.getByRole('button', { name: /^parent$/i }));
    fireEvent.click(screen.getByRole('option', { name: 'Push Day' }));

    expect(screen.getByText('Push Day')).toBeDefined();
    expect(screen.queryByText('Variation: Pull Day Variation A')).toBeNull();

    // 6. Check Push Day variations
    fireEvent.click(screen.getByRole('button', { name: /^variation$/i }));
    expect(screen.getByRole('option', { name: 'Push Day Variation A' })).toBeDefined();
    expect(screen.queryByRole('option', { name: 'Pull Day Variation A' })).toBeNull();
  });
});
