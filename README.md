# KAZ Image Craft

**KAZ Image Craft** is a lightweight, fully client-side image editing tool before upload, designed for modern web applications. It supports cropping, rotating, previewing, drag-and-drop sorting, and managing multiple images with ease — all in JavaScript, with no dependencies.

## 🚀 Usage

### 1. Include the Library

Add the CSS and JS files to your HTML page using one of the following methods:

## Option 1: Local Files

```html
<link rel="stylesheet" href="kaz-image-craft.css">
<script src="lang/en-us.js"></script>
<script src="kaz-image-craft.js"></script>
```

## Option 2: CDN (jsDelivr)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/cnkz/kaz-image-craft@latest/css/kaz-image-craft.css">
<script src="https://cdn.jsdelivr.net/gh/cnkz/kaz-image-craft@latest/js/kaz-image-craft-lang-en-us.js"></script>
<script src="https://cdn.jsdelivr.net/gh/cnkz/kaz-image-craft@latest/js/kaz-image-craft.js"></script>
```

> **Note**: Using CDN ensures you always get the latest version, while local files give you more control over updates and work offline.

### 2. Prepare Your HTML

Create a form with one or more `<input type="file">` elements:

```html
<form class="kaz-upload-form">
  <input
    type="file"
    class="kaz-file-input"
    data-preview="preview-container"
    multiple
    data-max="5"
    accept="image/*"
    name="images[]"
    data-target-existing="#existingImages"
  >
  <input 
    type="text" 
    id="existingImages" 
    name="existing_images" 
    value='["http://localhost/img/a.png", "http://localhost/img/b.png", "http://localhost/static/img/c.png"]'
  >
</form>
```

> **Note:** The attribute `data-max="5"` limits the maximum number of images that can be uploaded. Set it to `0` for unlimited uploads.

> **Note:** `data-target-existing="#existingImages"` tells the uploader which element holds the list of existing images. The uploader reads the URLs from that element to show already uploaded images for preview or editing.

### 3. Initialize Uploaders

Call the initialization function like this:

```html
<script>
document.addEventListener('DOMContentLoaded', () => {
  KazImageCraft._init('kaz-file-input', 'kaz-upload-form');
});
</script>
```
> **Note:** Pass the CSS class name of the file input element as the first parameter, and the CSS class name of the form as the second parameter.

### 4. Inject Files Before Programmatic Form Submission

If you submit your form **normally** (e.g., user clicks the submit button), you **do not** need to call this method.

However, if you submit the form **programmatically** via JavaScript (e.g., using `form.submit()`), you **must** call this method first to ensure all selected images are properly included in the form data.

**Usage:**

```js
KazImageCraft.injectAllFiles();
form.submit();

```

### 5. Customize Language (Optional)

`kaz-image-craft-lang-en-us.js` is the language file. You can translate it yourself or use any existing language file directly.

You can also override default UI texts by modifying the global `window.kazImageCraftLang` object.


## 📦 Features

Before uploading, you can limit the number of images selected. The tool also supports:

- 🖼️ **Image preview** with optional transformations  
- 🖼️ **Drag-and-drop sorting** to rearrange image order  
- ✂️ **Crop and rotate**:  
  - Crop images to any size or aspect ratio  
  - Rotate at any angle using an intuitive rotation dial:
    - The outer ring lets you freely rotate the image by dragging it in a circular motion.

    - The inner circle allows you to move the rotation center anywhere on the image, so you can rotate around any custom point instead of just the center. 
  - Drag the rotation center to any point on the image  
  - Flip horizontally or vertically  
- ♻️ **Reset** to the original image  
- 🗃️ **Manage multiple images** per input field  
- 🚫 **Detect duplicate uploads** automatically  
- ⚙️ **Fully modular and framework-free** (pure JavaScript)


## 🧠 About KAZ Image Craft

**KAZ Image Craft** is a part of the KAZCMS ecosystem — a collection of minimal, open-source web components inspired by simplicity and control.

**Demo:** https://www.kazcms.com/en-us/demo/kaz-image-craft

It was built to offer:

- A polished, distraction-free user experience
- Native JavaScript implementation (no frameworks)
- Easy integration into any CMS or form

Perfect for portfolios, admin panels, or rich content editors.

## 📄 License

This project is licensed under the MIT License.

## 📫 Contact

For questions or feedback, feel free to contact me at **y@9.kz**.