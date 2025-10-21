import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, RefreshCw } from 'lucide-react';
import { useTenantFilter } from './TenantAwareComponent';
import Button from '../ui/Button';

interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
}

interface TenantAwareDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onRefresh?: () => void;
  onExport?: (filteredData: T[]) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  pageSize?: number;
}

export function TenantAwareDataTable<T extends { tenantId?: string }>({
  data,
  columns,
  loading = false,
  onRefresh,
  onExport,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data available',
  className = '',
  pageSize = 10
}: TenantAwareDataTableProps<T>) {
  const { filterByTenant, hasTenant, currentTenant } = useTenantFilter();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data by tenant first
  const tenantFilteredData = useMemo(() => {
    if (!hasTenant) return [];
    return filterByTenant(data);
  }, [data, filterByTenant, hasTenant]);

  // Apply search filter
  const searchFilteredData = useMemo(() => {
    if (!searchTerm) return tenantFilteredData;
    
    return tenantFilteredData.filter(item => {
      return columns.some(column => {
        const value = item[column.key as keyof T];
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      });
    });
  }, [tenantFilteredData, searchTerm, columns]);

  // Apply sorting
  const sortedData = useMemo(() => {
    if (!sortConfig) return searchFilteredData;
    
    return [...searchFilteredData].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof T];
      const bValue = b[sortConfig.key as keyof T];
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [searchFilteredData, sortConfig]);

  // Apply pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleExport = () => {
    if (onExport) {
      onExport(sortedData);
    }
  };

  if (!hasTenant) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 text-center ${className}`}>
        <div className="text-gray-500">
          Please select a tenant to view data
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header with controls */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-sm text-gray-500">
              Showing {paginatedData.length} of {sortedData.length} records for {currentTenant?.name}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={sortedData.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && sortConfig?.key === column.key && (
                      <span className="text-blue-600">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                    <span className="text-gray-500">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  {searchTerm ? `No results found for "${searchTerm}"` : emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={String(column.key)} className="px-6 py-4 whitespace-nowrap">
                      {column.render
                        ? column.render(record[column.key as keyof T], record, index)
                        : String(record[column.key as keyof T] || '')
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}