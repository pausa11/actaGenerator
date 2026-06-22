import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10.5,
    paddingTop: 55,
    paddingBottom: 65,
    paddingHorizontal: 60,
    color: '#374151',
  },
  h1Wrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingBottom: 10,
    marginBottom: 20,
  },
  h1: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  h2: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    marginTop: 18,
    marginBottom: 8,
  },
  h3: {
    fontSize: 11.5,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    marginTop: 12,
    marginBottom: 5,
  },
  paragraph: {
    marginBottom: 8,
    lineHeight: 1.6,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 10,
  },
  bullet: {
    width: 14,
    color: '#9ca3af',
  },
  listText: {
    flex: 1,
    lineHeight: 1.5,
  },
  orderedIndex: {
    width: 20,
    color: '#6b7280',
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginVertical: 12,
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 9,
    bottom: 28,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#9ca3af',
  },
});

type InlineSegment = { text: string; bold?: boolean; italic?: boolean };

function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const re = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index) });
    if (match[1]) segments.push({ text: match[1], bold: true, italic: true });
    else if (match[2]) segments.push({ text: match[2], bold: true });
    else if (match[3]) segments.push({ text: match[3], italic: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments.length > 0 ? segments : [{ text }];
}

function renderInline(text: string) {
  return parseInline(text).map((seg, i) => {
    if (seg.bold && seg.italic)
      return <Text key={i} style={{ fontFamily: 'Helvetica-BoldOblique' }}>{seg.text}</Text>;
    if (seg.bold)
      return <Text key={i} style={{ fontFamily: 'Helvetica-Bold' }}>{seg.text}</Text>;
    if (seg.italic)
      return <Text key={i} style={{ fontFamily: 'Helvetica-Oblique' }}>{seg.text}</Text>;
    return <Text key={i}>{seg.text}</Text>;
  });
}

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'ordered'; text: string; index: number }
  | { type: 'hr' }
  | { type: 'blank' };

function parseMarkdown(md: string): Block[] {
  const blocks: Block[] = [];
  for (const line of md.split('\n')) {
    const t = line.trim();
    if (!t) {
      blocks.push({ type: 'blank' });
    } else if (t.startsWith('### ')) {
      blocks.push({ type: 'h3', text: t.slice(4) });
    } else if (t.startsWith('## ')) {
      blocks.push({ type: 'h2', text: t.slice(3) });
    } else if (t.startsWith('# ')) {
      blocks.push({ type: 'h1', text: t.slice(2) });
    } else if (t === '---' || t === '***' || t === '___') {
      blocks.push({ type: 'hr' });
    } else if (/^[-*+] /.test(t)) {
      blocks.push({ type: 'bullet', text: t.slice(2) });
    } else if (/^\d+\.\s/.test(t)) {
      const m = t.match(/^(\d+)\.\s+(.*)/);
      if (m) blocks.push({ type: 'ordered', text: m[2], index: parseInt(m[1]) });
    } else {
      blocks.push({ type: 'paragraph', text: t });
    }
  }
  return blocks;
}

function renderBlock(block: Block, i: number): React.ReactElement | null {
  switch (block.type) {
    case 'h1':
      return (
        <View key={i} style={styles.h1Wrapper}>
          <Text style={styles.h1}>{block.text}</Text>
        </View>
      );
    case 'h2':
      return <Text key={i} style={styles.h2}>{block.text}</Text>;
    case 'h3':
      return <Text key={i} style={styles.h3}>{block.text}</Text>;
    case 'paragraph':
      return (
        <Text key={i} style={styles.paragraph}>
          {renderInline(block.text)}
        </Text>
      );
    case 'bullet':
      return (
        <View key={i} style={styles.listItem}>
          <Text style={styles.bullet}>•  </Text>
          <Text style={styles.listText}>{renderInline(block.text)}</Text>
        </View>
      );
    case 'ordered':
      return (
        <View key={i} style={styles.listItem}>
          <Text style={styles.orderedIndex}>{block.index}.</Text>
          <Text style={styles.listText}>{renderInline(block.text)}</Text>
        </View>
      );
    case 'hr':
      return <View key={i} style={styles.hr} />;
    default:
      return null;
  }
}

export function ActaDocument({ markdown }: { markdown: string }) {
  const blocks = parseMarkdown(markdown);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {blocks.map((block, i) => renderBlock(block, i))}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
