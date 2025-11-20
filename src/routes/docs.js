import { Router } from 'express';
import PDFDocument from 'pdfkit';

const router = Router();

function writeSection(doc, title, body){
  doc.moveDown(1.2);
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#ffffff').text(title);
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(12).fillColor('#d1d5db').text(body, { align: 'left' });
}

function buildPdf(title, sections){
  const doc = new PDFDocument({ size: 'LETTER', margin: 48, bufferPages: true });
  // Header bar
  const gradStart = '#0b1f3a';
  const gradEnd = '#162a4b';
  doc.rect(0, 0, doc.page.width, 90).fill(gradStart);
  doc.fillColor('#d7a333').font('Helvetica-Bold').fontSize(20).text(title, 48, 34);
  doc.moveDown(2);
  doc.fillColor('#ffffff');

  sections.forEach((sec)=> writeSection(doc, sec.h, sec.p));

  // Footer bar
  const bottom = doc.page.height - 60;
  doc.save();
  doc.rect(0, bottom, doc.page.width, 60).fill(gradEnd);
  doc.fillColor('#d7a333').fontSize(10).text('InvisiShield • Generated Document', 48, bottom+22);
  doc.restore();

  return doc;
}

router.get('/:slug.pdf', async (req, res) => {
  const { slug } = req.params;
  const map = {
    'InvisiShield_Testing_Report': {
      title: 'InvisiShield Testing Report',
      sections: [
        { h: 'Summary', p: 'This report summarizes lab and field testing for InvisiShield. All tests indicate excellent durability and optical clarity across varying temperatures and humidity conditions.' },
        { h: 'Methodology', p: 'We performed ASTM scratch tests, UV exposure, and thermal cycling. Samples were mounted on aluminum and polycarbonate substrates to simulate real-world installations.' },
        { h: 'Results', p: 'Scratch resistance exceeded baseline by 34%. UV yellowing remained under 1.5% delta over 800 hours. Adhesion maintained 98% across 200 thermal cycles.' },
      ]
    },
    'InvisiShield_Tech_Specs': {
      title: 'InvisiShield Technical Specifications',
      sections: [
        { h: 'Composition', p: 'Multi-layer film with nano-coating for scratch resistance. Nominal thickness 150μm. Optical clarity >92%.' },
        { h: 'Operating Range', p: 'Temperature -20°C to 80°C. Humidity 10%–90% non-condensing. UV protection integrated in topcoat.' },
        { h: 'Compliance', p: 'RoHS compliant. REACH Annex XVII compliant. Manufactured in ISO 9001 certified facility.' },
      ]
    },
    'InvisiShield_Patent_Summary': {
      title: 'InvisiShield Patent Summary',
      sections: [
        { h: 'Overview', p: 'This document provides a non-confidential summary of the novel layer stack and adhesion mechanism used by InvisiShield.' },
        { h: 'Claims (Summary)', p: 'Key claims relate to the self-healing topcoat process, micro-venting channels to minimize bubbles, and UV-stable adhesives.' },
        { h: 'Status', p: 'Provisional filings completed. Utility application drafted and under internal review.' },
      ]
    },
    'NDA_Form': {
      title: 'Mutual Non-Disclosure Agreement (Template)',
      sections: [
        { h: 'Introduction', p: 'This Mutual NDA facilitates confidential discussions between the parties regarding potential collaboration and evaluation of proprietary technology.' },
        { h: 'Confidential Information', p: 'All technical, business, and financial information shared is considered confidential under this agreement unless explicitly stated otherwise.' },
        { h: 'Term', p: 'Unless terminated earlier, the confidentiality obligations continue for three (3) years after the last disclosure.' },
      ]
    }
  };

  const key = slug in map ? slug : Object.keys(map).find(k => k.toLowerCase() === slug.toLowerCase());
  const cfg = key ? map[key] : {
    title: slug.replace(/_/g,' '),
    sections: [
      { h: 'Overview', p: 'This is a generated placeholder PDF containing example content for preview and testing.' },
      { h: 'Details', p: 'Replace this with your real document content as needed. The server renders this on-demand using PDFKit.' },
      { h: 'Next Steps', p: 'Integrate with your CMS or database to render real documents dynamically.' },
    ]
  };

  res.status(200);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${cfg.title}.pdf"`);
  const doc = buildPdf(cfg.title, cfg.sections);
  doc.pipe(res);
  doc.end();
});

export default router;
