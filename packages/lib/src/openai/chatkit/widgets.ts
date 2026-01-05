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
  | 'chart'
  | 'list'
  | 'accordion'
  | 'calendar'
  | 'map'
  | 'video'
  | 'audio'
  | 'code';

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
  chartType: 'line' | 'bar' | 'pie' | 'area' | 'doughnut' | 'radar' | 'scatter';
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

export interface ListWidget extends BaseWidget {
  type: 'list';
  items: Array<{
    id?: string;
    title: string;
    description?: string;
    icon?: string;
    image?: string;
    badge?: string;
    metadata?: Record<string, unknown>;
  }>;
  layout?: 'vertical' | 'horizontal';
  selectable?: boolean;
  multiSelect?: boolean;
}

export interface AccordionWidget extends BaseWidget {
  type: 'accordion';
  items: Array<{
    id?: string;
    title: string;
    content: Widget[];
    defaultOpen?: boolean;
  }>;
  allowMultiple?: boolean;
}

export interface CalendarWidget extends BaseWidget {
  type: 'calendar';
  mode?: 'single' | 'range' | 'multiple';
  selectedDates?: string[];
  minDate?: string;
  maxDate?: string;
  disabledDates?: string[];
  events?: Array<{
    date: string;
    title: string;
    description?: string;
    color?: string;
  }>;
}

export interface MapWidget extends BaseWidget {
  type: 'map';
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    id?: string;
    position: { lat: number; lng: number };
    title?: string;
    description?: string;
    icon?: string;
  }>;
  mapType?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
}

export interface VideoWidget extends BaseWidget {
  type: 'video';
  url: string;
  thumbnail?: string;
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  width?: number;
  height?: number;
}

export interface AudioWidget extends BaseWidget {
  type: 'audio';
  url: string;
  title?: string;
  artist?: string;
  thumbnail?: string;
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;
}

export interface CodeWidget extends BaseWidget {
  type: 'code';
  code: string;
  language?: string;
  theme?: 'light' | 'dark';
  readOnly?: boolean;
  showLineNumbers?: boolean;
  highlightLines?: number[];
}

export type Widget = 
  | ButtonWidget 
  | TextWidget 
  | ImageWidget 
  | FileWidget 
  | FormWidget 
  | CardWidget 
  | TableWidget 
  | ChartWidget
  | ListWidget
  | AccordionWidget
  | CalendarWidget
  | MapWidget
  | VideoWidget
  | AudioWidget
  | CodeWidget;

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
 * Create a list widget
 */
export function createListWidget(options: Omit<ListWidget, 'type'>): ListWidget {
  return {
    type: 'list',
    layout: 'vertical',
    selectable: false,
    multiSelect: false,
    ...options,
  };
}

/**
 * Create an accordion widget
 */
export function createAccordionWidget(options: Omit<AccordionWidget, 'type'>): AccordionWidget {
  return {
    type: 'accordion',
    allowMultiple: false,
    ...options,
  };
}

/**
 * Create a calendar widget
 */
export function createCalendarWidget(options: Omit<CalendarWidget, 'type'>): CalendarWidget {
  return {
    type: 'calendar',
    mode: 'single',
    ...options,
  };
}

/**
 * Create a map widget
 */
export function createMapWidget(options: Omit<MapWidget, 'type'>): MapWidget {
  return {
    type: 'map',
    zoom: 10,
    mapType: 'roadmap',
    ...options,
  };
}

/**
 * Create a video widget
 */
export function createVideoWidget(options: Omit<VideoWidget, 'type'>): VideoWidget {
  return {
    type: 'video',
    autoplay: false,
    controls: true,
    loop: false,
    muted: false,
    ...options,
  };
}

/**
 * Create an audio widget
 */
export function createAudioWidget(options: Omit<AudioWidget, 'type'>): AudioWidget {
  return {
    type: 'audio',
    autoplay: false,
    controls: true,
    loop: false,
    ...options,
  };
}

/**
 * Create a code widget
 */
export function createCodeWidget(options: Omit<CodeWidget, 'type'>): CodeWidget {
  return {
    type: 'code',
    language: 'javascript',
    theme: 'light',
    readOnly: true,
    showLineNumbers: true,
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
    case 'list':
      if (!('items' in widget) || !Array.isArray(widget.items) || widget.items.length === 0) {
        errors.push('List widget requires at least one item');
      }
      break;
    case 'accordion':
      if (!('items' in widget) || !Array.isArray(widget.items) || widget.items.length === 0) {
        errors.push('Accordion widget requires at least one item');
      }
      break;
    case 'calendar':
      // Calendar widget validation is optional
      break;
    case 'map':
      if (!('center' in widget) || !widget.center) {
        errors.push('Map widget requires center coordinates');
      }
      break;
    case 'video':
      if (!('url' in widget) || !widget.url) {
        errors.push('Video widget requires a URL');
      }
      break;
    case 'audio':
      if (!('url' in widget) || !widget.url) {
        errors.push('Audio widget requires a URL');
      }
      break;
    case 'code':
      if (!('code' in widget) || !widget.code) {
        errors.push('Code widget requires code content');
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
