import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { fireEvent } from '@testing-library/dom';
import { AdminTable, AdminTableColumn, AdminTableAction } from '@/components/admin/AdminTable';

// Mock data
const mockData = [
  {
    id: '1',
    name: 'Test Item 1',
    status: 'active',
    isPublished: true,
    createdAt: new Date('2024-01-01'),
    metadata: { category: 'test' },
  },
  {
    id: '2', 
    name: 'Test Item 2',
    status: 'inactive',
    isPublished: false,
    createdAt: new Date('2024-01-02'),
    metadata: { category: 'demo' },
  },
];

const mockColumns: AdminTableColumn[] = [
  {
    key: 'name',
    header: 'Name',
  },
  {
    key: 'status',
    header: 'Status',
  },
  {
    key: 'isPublished',
    header: 'Published',
  },
  {
    key: 'createdAt',
    header: 'Created',
  },
  {
    key: 'metadata',
    header: 'Metadata',
  },
];

describe('AdminTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders table with data correctly', () => {
    render(
      <AdminTable 
        data={mockData} 
        columns={mockColumns}
      />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(
      <AdminTable 
        data={[]} 
        columns={mockColumns}
        isLoading={true}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays empty state with custom message', () => {
    const emptyMessage = 'No items found';
    
    render(
      <AdminTable 
        data={[]} 
        columns={mockColumns}
        emptyMessage={emptyMessage}
      />
    );

    expect(screen.getByText(emptyMessage)).toBeInTheDocument();
  });

  it('renders boolean values as badges', () => {
    render(
      <AdminTable 
        data={mockData} 
        columns={mockColumns}
      />
    );

    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('renders date values correctly', () => {
    render(
      <AdminTable 
        data={mockData} 
        columns={mockColumns}
      />
    );

    expect(screen.getByText('1/1/2024')).toBeInTheDocument();
    expect(screen.getByText('1/2/2024')).toBeInTheDocument();
  });

  it('renders object values as JSON strings', () => {
    render(
      <AdminTable 
        data={mockData} 
        columns={mockColumns}
      />
    );

    expect(screen.getByText('{"category":"test"}')).toBeInTheDocument();
    expect(screen.getByText('{"category":"demo"}')).toBeInTheDocument();
  });

  it('renders custom cell content', () => {
    const customColumns: AdminTableColumn[] = [
      {
        key: 'name',
        header: 'Custom Name',
        cell: (item) => <strong data-testid="custom-cell">{item.name.toUpperCase()}</strong>,
      },
    ];

    render(
      <AdminTable 
        data={mockData} 
        columns={customColumns}
      />
    );

    expect(screen.getByTestId('custom-cell')).toHaveTextContent('TEST ITEM 1');
  });

  it('renders single action as button', () => {
    const mockAction = vi.fn();
    const actions: AdminTableAction[] = [
      {
        label: 'Edit',
        onClick: mockAction,
      },
    ];

    render(
      <AdminTable 
        data={mockData} 
        columns={mockColumns}
        actions={actions}
      />
    );

    const editButtons = screen.getAllByText('Edit');
    expect(editButtons).toHaveLength(2);
    
    fireEvent.click(editButtons[0]);
    expect(mockAction).toHaveBeenCalledWith(mockData[0]);
  });

  it('renders multiple actions in dropdown', () => {
    const mockEdit = vi.fn();
    const mockDelete = vi.fn();
    
    const actions: AdminTableAction[] = [
      {
        label: 'Edit',
        onClick: mockEdit,
      },
      {
        label: 'Delete',
        onClick: mockDelete,
        variant: 'destructive',
      },
    ];

    render(
      <AdminTable 
        data={mockData} 
        columns={mockColumns}
        actions={actions}
      />
    );

    // Should render dropdown triggers
    const dropdownTriggers = screen.getAllByRole('button');
    expect(dropdownTriggers.length).toBeGreaterThan(0);
  });

  it('uses custom key extractor', () => {
    const customKeyExtractor = (item: any) => `custom-${item.name}`;
    
    render(
      <AdminTable 
        data={mockData} 
        columns={mockColumns}
        keyExtractor={customKeyExtractor}
      />
    );

    // Verify table renders (key extractor works internally)
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <AdminTable 
        data={mockData} 
        columns={mockColumns}
        className="custom-table-class"
      />
    );

    expect(container.querySelector('.custom-table-class')).toBeInTheDocument();
  });
});