'use client';

// =====================================================
// Resume PDF Parser — Client-side text extraction
// Uses pdfjs-dist v4+ API (no external CDN worker needed)
// =====================================================

/**
 * Extract plain text from a PDF file
 * @param file - The PDF File object from an input/drop event
 * @returns The extracted text content
 */
export async function extractTextFromPDF(file: File): Promise<string> {
    // Dynamic import so this is only loaded client-side
    const pdfjsLib = await import('pdfjs-dist');

    // In pdfjs-dist v4+, point to the bundled worker that ships with the package
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
            .filter((item) => 'str' in item)
            .map((item) => (item as { str: string }).str)
            .join(' ');
        textParts.push(pageText.trim());
    }

    // Join pages, collapse whitespace runs
    return textParts
        .join('\n\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
