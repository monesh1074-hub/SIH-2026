import sys
import json
import os
import logging
import pypdf

# Suppress pypdf verbose warnings
logging.getLogger("pypdf").setLevel(logging.ERROR)

def extract_pdf_content(pdf_path):
    if not os.path.exists(pdf_path):
        return {"success": False, "error": f"File {pdf_path} not found"}
    
    try:
        reader = pypdf.PdfReader(pdf_path, strict=False)
        pages_text = []
        total_text = ""
        has_images = False
        extracted_image_paths = []
        
        # Directory for extracted page images
        out_dir = os.path.join(os.path.dirname(pdf_path), "extracted_images")
        os.makedirs(out_dir, exist_ok=True)
        
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            pages_text.append({"page": i + 1, "text": page_text})
            total_text += page_text + "\n"
            
            # Check for embedded scanned images
            if hasattr(page, "images") and len(page.images) > 0:
                has_images = True
                for img_idx, img_file in enumerate(page.images):
                    img_name = f"page_{i+1}_img_{img_idx}_{os.path.basename(pdf_path)}.png"
                    img_path = os.path.join(out_dir, img_name)
                    try:
                        with open(img_path, "wb") as fp:
                            fp.write(img_file.data)
                        extracted_image_paths.append(img_path)
                    except Exception:
                        pass
                
        return {
            "success": True,
            "pageCount": len(reader.pages),
            "totalText": total_text.strip(),
            "pages": pages_text,
            "hasImages": has_images,
            "extractedImagePaths": extracted_image_paths
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        result = extract_pdf_content(sys.argv[1])
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(json.dumps({"error": "No PDF path provided"}))
