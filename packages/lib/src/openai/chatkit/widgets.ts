/**
 * ChatKit Widgets Integration
 * 
 * Utilities for creating and managing ChatKit widgets
 * Based on OpenAI ChatKit Widgets specification
 */

export type WidgetType = 
  | 'button'
  | 'text'
  | 'image'
  | 'file'
  | 'form'
  | 'card'
  | 'table'
  | 'chart';

export interface WidgetAction {
  type: 'submit' | 'navigate' | 'callback' | 'open_url';
  url?: string;
  callback?: string;
  data?: Record<string, unknown>;
}

export interface BaseWidget {
  type: WidgetType;
  id?: string;
  title?: string;
  description?: string;
  actions?: WidgetAction[];
}

export interface ButtonWidget extends BaseWidget {
  type: 'button';
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  disabled?: boolean;
  loading?: boolean;
}

export interface TextWidget extends BaseWidget {
  type: 'text';
  content: string;
  format?: 'plain' | 'markdown' | 'html';
}

export interface ImageWidget extends BaseWidget {
  type: 'image';
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface FileWidget extends BaseWidget {
  type: 'file';
  url: string;
  filename: string;
  mimeType?: string;
  size?: number;
}

export interface FormWidget extends BaseWidget {
  type: 'form';
  fields: FormField[];
  submitLabel?: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'password' | 'textarea' | 'select' | 'checkbox' | 'radio';
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  options?: Array<{ label: string; value: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface CardWidget extends BaseWidget {
  type: 'card';
  header?: string;
  content: Widget[];
  footer?: string;
}

export interface TableWidget extends BaseWidget {
  type: 'table';
  headers: string[];
  rows: (string | number)[][];
  sortable?: boolean;
}

export interface ChartWidget extends BaseWidget {
  type: 'chart';
  chartType: 'line' | 'bar' | 'pie' | 'area';
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string;
      borderColor?: string;
    }>;
  };
  options?: Record<string, unknown>;
}

export type Widget = 
  | ButtonWidget 
  | TextWidget 
  | ImageWidget 
  | FileWidget 
  | FormWidget 
  | CardWidget 
  | TableWidget 
  | ChartWidget;

export interface WidgetMessage {
  role: 'assistant' | 'user' | 'system';
  content: string;
  widgets?: Widget[];
  metadata?: Record<string, unknown>;
}

/**
 * Create a button widget
 */
export function createButtonWidget(options: Omit<ButtonWidget, 'type'>): ButtonWidget {
  return {
    type: 'button',
    variant: 'primary',
    ...options,
  };
}

/**
 * Create a text widget
 */
export function createTextWidget(options: Omit<TextWidget, 'type'>): TextWidget {
  return {
    type: 'text',
    format: 'plain',
    ...options,
  };
}

/**
 * Create an image widget
 */
export function createImageWidget(options: Omit<ImageWidget, 'type'>): ImageWidget {
  return {
    type: 'image',
    ...options,
  };
}

/**
 * Create a file widget
 */
export function createFileWidget(options: Omit<FileWidget, 'type'>): FileWidget {
  return {
    type: 'file',
    ...options,
  };
}

/**
 * Create a form widget
 */
export function createFormWidget(options: Omit<FormWidget, 'type'>): FormWidget {
  return {
    type: 'form',
    submitLabel: 'Submit',
    ...options,
  };
}

/**
 * Create a card widget
 */
export function createCardWidget(options: Omit<CardWidget, 'type'>): CardWidget {
  return {
    type: 'card',
    ...options,
  };
}

/**
 * Create a table widget
 */
export function createTableWidget(options: Omit<TableWidget, 'type'>): TableWidget {
  return {
    type: 'table',
    sortable: false,
    ...options,
  };
}

/**
 * Create a chart widget
 */
export function createChartWidget(options: Omit<ChartWidget, 'type'>): ChartWidget {
  return {
    type: 'chart',
    ...options,
  };
}

/**
 * Validate widget structure
 */
export function validateWidget(widget: Widget): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!widget.type) {
    errors.push('Widget type is required');
  }

  switch (widget.type) {
    case 'button':
      if (!('label' in widget) || !widget.label) {
        errors.push('Button widget requires a label');
      }
      break;
    case 'text':
      if (!('content' in widget) || !widget.content) {
        errors.push('Text widget requires content');
      }
      break;
    case 'image':
      if (!('url' in widget) || !widget.url) {
        errors.push('Image widget requires a URL');
      }
      break;
    case 'file':
      if (!('url' in widget) || !widget.url) {
        errors.push('File widget requires a URL');
      }
      if (!('filename' in widget) || !widget.filename) {
        errors.push('File widget requires a filename');
      }
      break;
    case 'form':
      if (!('fields' in widget) || !Array.isArray(widget.fields) || widget.fields.length === 0) {
        errors.push('Form widget requires at least one field');
      }
      break;
    case 'card':
      if (!('content' in widget) || !Array.isArray(widget.content) || widget.content.length === 0) {
        errors.push('Card widget requires at least one content widget');
      }
      break;
    case 'table':
      if (!('headers' in widget) || !Array.isArray(widget.headers) || widget.headers.length === 0) {
        errors.push('Table widget requires headers');
      }
      if (!('rows' in widget) || !Array.isArray(widget.rows)) {
        errors.push('Table widget requires rows');
      }
      break;
    case 'chart':
      if (!('data' in widget) || !widget.data) {
        errors.push('Chart widget requires data');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Serialize widget to JSON for API transmission
 */
export function serializeWidget(widget: Widget): string {
  return JSON.stringify(widget);
}

/**
 * Parse widget from JSON
 */
export function parseWidget(json: string): Widget {
  return JSON.parse(json) as Widget;
}
