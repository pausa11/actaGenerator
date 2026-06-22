'use client';

import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ActaDocument } from '@/lib/acta-document';

export function BotonDescargarPDF({ markdown }: { markdown: string }) {
  const fileName = `acta-${new Date().toISOString().split('T')[0]}.pdf`;
  return (
    <PDFDownloadLink
      document={<ActaDocument markdown={markdown} />}
      fileName={fileName}
      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
    >
      {({ loading }) => (loading ? 'Generando PDF…' : 'Exportar PDF')}
    </PDFDownloadLink>
  );
}
