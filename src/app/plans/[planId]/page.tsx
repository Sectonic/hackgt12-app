import fs from 'fs';
import path from 'path';
import { parseString } from 'xml2js';

import Editor from './editor';
import { Item } from './types';
import PlanEditorClient from './plan-editor-client';

interface EditorPageProps {
  params: {
    planId: string;
  };
}

function parseSvgDimensions(svgPath: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    try {
      const svgContent = fs.readFileSync(svgPath, 'utf8');
      parseString(svgContent, (err, result) => {
        if (err || !result.svg || !result.svg.$) {
          resolve({ width: 50, height: 50 });
          return;
        }

        const svgAttrs = result.svg.$;
        let width = 50;
        let height = 50;

        if (svgAttrs.width && svgAttrs.height) {
          width = parseFloat(svgAttrs.width.replace(/[^\d.-]/g, ''));
          height = parseFloat(svgAttrs.height.replace(/[^\d.-]/g, ''));
        } else if (svgAttrs.viewBox) {
          const viewBox = svgAttrs.viewBox.split(' ');
          if (viewBox.length >= 4) {
            width = parseFloat(viewBox[2]);
            height = parseFloat(viewBox[3]);
          }
        }

        resolve({ width: width || 50, height: height || 50 });
      });
    } catch (error) {
      resolve({ width: 50, height: 50 });
    }
  });
}

async function getIconFiles(directory: string, type: 'furniture' | 'foundational'): Promise<Item[]> {
  try {
    const fullPath = path.join(process.cwd(), 'public', 'icons', directory);
    const files = fs.readdirSync(fullPath);
    const svgFiles = files.filter((file) => file.endsWith('.svg'));

    const items = await Promise.all(
      svgFiles.map(async (file) => {
        const name = file.replace('.svg', '');
        const svgPath = path.join(fullPath, file);
        const dimensions = await parseSvgDimensions(svgPath);

        let subtype: 'door' | 'window' | undefined;
        if (name.includes('door')) {
          subtype = 'door';
        } else if (name.includes('window')) {
          subtype = 'window';
        }

        return {
          file: name,
          name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
          type,
          subtype,
          width: dimensions.width,
          height: dimensions.height,
          inverted: false,
          rotation: 0,
          scale: 1,
        } satisfies Item;
      }),
    );

    return items;
  } catch (error) {
    return [];
  }
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { planId } = await params;

  const furnitureItems = await getIconFiles('furniture', 'furniture');
  const foundationalItems = await getIconFiles('foundational', 'foundational');
  const allItems = [...furnitureItems, ...foundationalItems];

  return <PlanEditorClient planId={planId} editor={<Editor planId={planId} items={allItems} />} />;
}
