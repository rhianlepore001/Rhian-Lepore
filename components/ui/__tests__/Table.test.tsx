import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table, type TableColumn } from '../Table';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

interface MockData {
  id: string;
  name: string;
  age: number;
}

const DATA: MockData[] = [
  { id: '1', name: 'Alice', age: 25 },
  { id: '2', name: 'Bob', age: 30 },
];

const COLUMNS: TableColumn<MockData>[] = [
  {
    key: 'name',
    header: 'Nome',
    render: (row) => row.name,
  },
  {
    key: 'age',
    header: 'Idade',
    render: (row) => row.age.toString(),
  },
];

describe('Table Component', () => {
  it('renderiza a mensagem de tabela vazia (emptyMessage) se os dados estiverem vazios', () => {
    render(
      <Table
        columns={COLUMNS}
        data={[]}
        rowKey={(row) => row.id}
        emptyMessage="Nenhum dado disponível"
      />
    );

    expect(screen.getByText('Nenhum dado disponível')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renderiza cabeçalhos e linhas corretamente se houver dados', () => {
    render(
      <Table
        columns={COLUMNS}
        data={DATA}
        rowKey={(row) => row.id}
      />
    );

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    // Cabeçalhos
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('Idade')).toBeInTheDocument();

    // Células
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('chama onRowClick ao clicar com o mouse na linha', async () => {
    const onRowClick = vi.fn();
    render(
      <Table
        columns={COLUMNS}
        data={DATA}
        rowKey={(row) => row.id}
        onRowClick={onRowClick}
      />
    );

    // Como as linhas têm role="button", podemos selecioná-las
    const rows = screen.getAllByRole('button');
    expect(rows).toHaveLength(2);

    await userEvent.click(rows[0]);
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(DATA[0], 0);

    await userEvent.click(rows[1]);
    expect(onRowClick).toHaveBeenCalledTimes(2);
    expect(onRowClick).toHaveBeenCalledWith(DATA[1], 1);
  });

  it('chama onRowClick ao pressionar as teclas Enter ou Space', async () => {
    const onRowClick = vi.fn();
    render(
      <Table
        columns={COLUMNS}
        data={DATA}
        rowKey={(row) => row.id}
        onRowClick={onRowClick}
      />
    );

    const rows = screen.getAllByRole('button');
    const firstRow = rows[0];

    // Foca na linha
    firstRow.focus();
    expect(document.activeElement).toBe(firstRow);

    // Pressiona Enter
    await userEvent.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(DATA[0], 0);

    // Pressiona Space
    await userEvent.keyboard(' ');
    expect(onRowClick).toHaveBeenCalledTimes(2);
    expect(onRowClick).toHaveBeenCalledWith(DATA[0], 0);
  });
});
