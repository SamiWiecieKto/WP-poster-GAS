import * as mammoth from 'mammoth';

export async function extractHtmlFromDocx(file: File): Promise<{ html: string; title: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  
  // Extract a title from the HTML or use filename
  let title = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
  
  // Try to find an H1 for the title
  const h1Match = result.value.match(/<h1>(.*?)<\/h1>/i);
  if (h1Match && h1Match[1]) {
    title = h1Match[1].replace(/<[^>]*>?/gm, ''); // Strip inner tags
  }

  return {
    html: result.value,
    title
  };
}
