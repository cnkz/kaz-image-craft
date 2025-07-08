/**
 * KazImageCraft.js
 *
 * Provides image preview, editing (crop, rotate, flip), and drag-and-drop reordering.
 * Designed for integration into forms with dynamic UI updates.
 *
 * @version 1.0
 * @author Y D <y@9.kz>
 * @website https://www.kazcms.com/kaz-image-craft
 * @license MIT
 */

class KazImageCraft {
  /**
   * Global storage for all uploaded images grouped by input name.
   * @type {Object.<string, Array<{id: string, file: File, previewUrl: string, editedUrl: string}>>}
   */
  static uploadedImages = {};
  static instances = []; 

  /**
   * @constructor
   * @param {HTMLInputElement} fileInput - The original file input element.
   * @param {HTMLElement} previewContainer - Container for image preview items.
   * @param {HTMLFormElement} form - Form element to bind submit events.
   * @param {string} [orderInputName='image_order'] - Name for hidden input fields tracking image order.
   */
  constructor(fileInput, previewContainer, form, orderInputName = 'image_order') {
    this.fileInput = fileInput;
    this.previewContainer = previewContainer;
    this.form = form;
    this.orderInputName = orderInputName;
    this.dragSrcEl = null;
    this.toolsName = '';
    this.flipX = 1;
    this.flipY = 1;
  }

  /**
   * Initializes all file inputs and binds KazImageCraft instances to them.
   * @param {string} [fileInputClass='kaz-image-craft-file-input']
   * @param {string} [formClass='kaz-image-craft-form']
   */
  static async  _init(fileInputClass = 'kaz-image-craft-file-input', formClass = 'kaz-image-craft-form') {
    const forms = document.querySelectorAll(`form.${formClass}`);
    for (const form of forms) {
      const inputs = form.querySelectorAll(`input.${fileInputClass}[type="file"]`);
      for (const input of inputs) {
        if (input.dataset.kazInit === "1") continue;
        input.dataset.kazInit = "1";
  
        const previewId = input.dataset.preview;
        let previewContainer = previewId
          ? document.getElementById(previewId)
          : form.querySelector('.kaz-image-craft-preview-container');
  
        if (!previewContainer) {
          const safeId = 'PreviewContainer_' + input.name.replace(/\W+/g, '_');
          previewContainer = document.createElement('div');
          previewContainer.id = safeId;
          previewContainer.classList.add('kaz-preview-container');
          input.parentNode.insertBefore(previewContainer, input.nextSibling);
        }
  
        const orderInputName = 'image_order_' + input.name.replace(/\W+/g, '_');
        const uploader = new KazImageCraft(input, previewContainer, form, orderInputName);
        await uploader._bind();  
  
        KazImageCraft.instances.push(uploader);
      }
    }
  }
  

/**
 * Injects files from all initialized KazImageCraft instances into their respective forms.
 * 
 * This method iterates over all KazImageCraft instances created by the static _init method
 * and calls their internal _injectFiles() method to prepare the files for submission.
 * 
 * Usage:
 * Call this method before submitting the form programmatically to ensure all selected files
 * are properly injected and included in the form data.
 * 
 * Example:
 *   KazImageCraft.injectAllFiles();
 *   form.submit();
 * 
 * @static
 * @memberof KazImageCraft
 */
static injectAllFiles() {
  KazImageCraft.instances.forEach(uploader => {
    console.log('injecting files for', uploader.fileInput.name);
    uploader._injectFiles();
  });
}


  /**
   * Binds events for file input and form submission. Also handles existing image population.
   * @private
   */
  async _bind() {
    this._createWrapper();
  
    this.fileInput.addEventListener('change', e => this._handleFiles(e.target.files));
  
    if (this.form) {
      this.form.addEventListener('submit', e => {
        this._injectFiles();
      });
    }
  
    const name = this.fileInput.name;
  
    const existingSelector = this.fileInput.dataset.targetExisting;
    if (existingSelector) {
      const hiddenInput = document.querySelector(existingSelector);
      if (hiddenInput) {
        try {
          let value = hiddenInput.value.trim();
  
          if (value.startsWith("[") && value.includes("'")) {
            value = value.replace(/'/g, '"');
          }
  
          const urls = JSON.parse(value);
  
          if (Array.isArray(urls)) {
            await this._loadExistingFiles(name, urls);  // 这里await
          }
        } catch (e) {
          console.warn('Invalid existing image data:', hiddenInput.value);
        }
      }
    }
  
    this._renderPreview(name);
  }
  

  /**
   * Handles dropped or selected files, checks duplicates and max limits.
   * @param {FileList} files - The list of selected files.
   * @private
   */
  _handleFiles(files) {
    const name = this.fileInput.name;
    if (!KazImageCraft.uploadedImages[name]) {
      KazImageCraft.uploadedImages[name] = [];
    }

    // Read max limit from data-max attribute
    const max = parseInt(this.fileInput.dataset.max || '0', 10);
    const currentCount = KazImageCraft.uploadedImages[name].length;
    const newFiles = Array.from(files);

    // Show alert if total number of files exceeds the limit
    if (max > 0 && currentCount + newFiles.length > max) {
      alert(`Maximum ${max} images allowed. You already uploaded ${currentCount}.`);
      this.fileInput.value = '';
      return;
    }

    newFiles.forEach(file => {
      if (!file.type.startsWith('image/')) return;

      // Check for duplicate file (by name and size)
      const duplicate = KazImageCraft.uploadedImages[name].some(
        img => img.file.name === file.name && img.file.size === file.size
      );

      // Ask user whether to keep duplicate
      if (duplicate) {
        const proceed = confirm(kazImageCraftLang.duplicate(file.name));
        if (!proceed) return;
      }

      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);

      KazImageCraft.uploadedImages[name].push({
        id,
        file,
        previewUrl,
        editedUrl: previewUrl
      });
    });

    this._renderPreview(name);
    this.fileInput.value = '';
  }

  /**
   * Renders image thumbnails in the preview container.
   * @param {string} name - The name of the file input.
   * @private
   */
  _renderPreview(name) {
    this.previewContainer.innerHTML = '';
    //const name = this.fileInput.name;
    const list = KazImageCraft.uploadedImages[name] || [];

    list.forEach((img, idx) => {
      const div = document.createElement('div');
      div.className = 'kaz-image-craft-preview-item';
      div.dataset.id = img.id;
      div.setAttribute('draggable', 'true');
      div.innerHTML = `
        <div class="kaz-image-craft-image-box">
          <img id="img-preview-${name}-${img.id}" src="${img.editedUrl}" alt="${img.file.name}" class="kaz-image-craft-image" data-uuid="${name}-${img.id}" data-originalSrc="${img.previewUrl}">
          <button type="button" class="kaz-image-craft-delete-btn" aria-label="${kazImageCraftLang.removeImage}">×</button>
        </div>
        <div class="kaz-image-craft-image-name">${img.file.name}</div>
      `;

      div.querySelector('.kaz-image-craft-delete-btn').addEventListener('click', () => {
        list.splice(idx, 1);
        this._renderPreview(name);
      });

      const imageEl = div.querySelector('.kaz-image-craft-image');
      imageEl.addEventListener('click', () => {
        this._showImagePreviewModal(img.id, name);
        this._addImageToKazListContainer(list, name);
        //document.getElementById('kaz-preview-image').dataset.uuid = img.id.replace('img-preview-', '');
      });

      div.addEventListener('dragstart', e => this._handleDragStart(e));
      div.addEventListener('dragover', e => this._handleDragOver(e));
      div.addEventListener('dragleave', e => this._handleDragLeave(e));
      div.addEventListener('drop', e => this._handleDrop(e));
      div.addEventListener('dragend', e => this._handleDragEnd(e));

      this.previewContainer.appendChild(div);
    });

    this._updateOrderInputs();
  }

  /**
   * Injects temporary hidden file inputs into the form before submit.
   * @private
   */
  _injectFiles() {
    if (!this.wrapper) return;
    this.wrapper.querySelectorAll('.temp-file-input').forEach(el => el.remove());

    const name = this.fileInput.name;
    const list = KazImageCraft.uploadedImages[name] || [];

    list.forEach(img => {
      if (!img.file) return;
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.name = name.endsWith('[]') ? name : name + '[]';
      fileInput.classList.add('temp-file-input');
      fileInput.style.display = 'none';

      const dt = new DataTransfer();
      dt.items.add(img.file);
      fileInput.files = dt.files;

      this.wrapper.appendChild(fileInput);
    });
  }

  /**
   * Updates hidden inputs representing the order of uploaded images.
   * @private
   */
  _updateOrderInputs() {
    this.form.querySelectorAll(`input[name^="${this.orderInputName}"]`).forEach(el => el.remove());
    const name = this.fileInput.name;
    const list = KazImageCraft.uploadedImages[name] || [];
    list.forEach((img, idx) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = `${this.orderInputName}[]`;
      input.value = `new:${idx}`;
      this.form.appendChild(input);
    });
  }

  /**
   * Handles the drag start event for reordering.
   * @param {DragEvent} e
   * @private
   */
  _handleDragStart(e) {
    this.dragSrcEl = e.currentTarget;
    this.dragSrcEl.classList.add('kaz-image-craft-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  }

  /**
   * Handles the drag over event on other image items.
   * @param {DragEvent} e
   * @private
   */
  _handleDragOver(e) {
    e.preventDefault();
    const el = e.currentTarget;
    if (el !== this.dragSrcEl) {
      el.classList.add('kaz-image-craft-drag-over');
    }
  }

  /**
   * Removes visual indicator during drag leave.
   * @param {DragEvent} e
   * @private
   */
  _handleDragLeave(e) {
    e.currentTarget.classList.remove('kaz-image-craft-drag-over');
  }

  /**
   * Handles drop and reorders DOM elements and list.
   * @param {DragEvent} e
   * @private
   */
  _handleDrop(e) {
    e.preventDefault();
    const el = e.currentTarget;
    if (el !== this.dragSrcEl) {
      const parent = this.previewContainer;
      const dragIndex = Array.from(parent.children).indexOf(this.dragSrcEl);
      const dropIndex = Array.from(parent.children).indexOf(el);
      if (dragIndex < dropIndex) {
        parent.insertBefore(this.dragSrcEl, el.nextSibling);
      } else {
        parent.insertBefore(this.dragSrcEl, el);
      }
      this._reorderImagesByDOM();
    }
    el.classList.remove('kaz-image-craft-drag-over');
    this.dragSrcEl.classList.remove('kaz-image-craft-dragging');
    this.dragSrcEl = null;
  }

  /**
   * Clears drag-related styles.
   * @private
   */
  _handleDragEnd() {
    this.previewContainer.querySelectorAll('.kaz-image-craft-preview-item').forEach(item => {
      item.classList.remove('kaz-image-craft-dragging', 'kaz-image-craft-drag-over');
    });
    this.dragSrcEl = null;
  }

  /**
   * Reorders internal list of images based on preview container DOM order.
   * @private
   */
  _reorderImagesByDOM() {
    const newOrder = [];
    const name = this.fileInput.name;
    this.previewContainer.querySelectorAll('.kaz-image-craft-preview-item').forEach(div => {
      const id = div.dataset.id;
      const img = KazImageCraft.uploadedImages[name].find(i => i.id === id);
      if (img) newOrder.push(img);
    });
    KazImageCraft.uploadedImages[name] = newOrder;
    this._updateOrderInputs();
  }


  /**
   * Creates the wrapper around the hidden file input.
   * @private
   */
  _createWrapper() {
    let wrapper = this.fileInput.nextElementSibling;
    if (!wrapper || !wrapper.classList.contains(this.fileInput.classList[0] + '-wrapper')) {
      wrapper = document.createElement('div');
      wrapper.classList.add(this.fileInput.classList[0] + '-wrapper');
      wrapper.classList.add('kaz-image-craft-wrapper');
      wrapper.textContent = kazImageCraftLang.dragDropHint; // Default hint
      this.fileInput.parentNode.insertBefore(wrapper, this.fileInput.nextSibling);
    }

    this.wrapper = wrapper;

    this.fileInput.style.display = 'none';

    // Bind events (drag and drop, click)
    this._bindWrapperEvents();
  }

  /**
   * Binds click and drag events to the wrapper.
   * @private
   */
  _bindWrapperEvents() {
    this.wrapper.addEventListener('click', () => this.fileInput.click());

    this.wrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.wrapper.classList.add('hover');
    });

    this.wrapper.addEventListener('dragleave', () => {
      this.wrapper.classList.remove('hover');
    });

    this.wrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      this.wrapper.classList.remove('hover');
      const files = e.dataTransfer.files;
      this._handleFiles(files);
    });
  }


  /**
   * Creates modal dialog for image preview/editing.
   * @private
   */
  _createPreviewModal() {
    if (document.getElementById('kaz-image-preview-modal')) return; // Already exists

    const modal = document.createElement('div');
    modal.id = 'kaz-image-preview-modal';
    modal.className = 'kaz-image-craft-modal';
    modal.style.display = 'none';
    modal.innerHTML = `
    <div class="kaz-image-craft-modal-title"></div>
    <div class="kaz-image-craft-modal-backdrop"></div>
    <div class="kaz-image-craft-modal-content">
      <span class="kaz-image-craft-modal-close">&times;</span>
      
      
      <div class="kaz-image-craft-modal-main">
              
              <div class="kaz-image-craft-modal-toolbar">
      

        <div class="kaz-image-craft-tool-item kaz-image-craft-tool-grid" title="${kazImageCraftLang.rotateAndFlip}">
          <div class="kaz-image-craft-tool-icon-grid">
            <div class="kaz-image-craft-tool-icon-cell kaz-tool-item" data-tool="crop">✂️</div>
            <div class="kaz-image-craft-tool-icon-cell kaz-tool-item" data-tool="rotate">⟳</div>
            <div class="kaz-image-craft-tool-icon-cell kaz-tool-item" data-tool="flip-h">⇋</div>
            <div class="kaz-image-craft-tool-icon-cell kaz-tool-item" data-tool="flip-v">↕</div>
          </div>
        </div>


        <div class="kaz-image-craft-tool-item kaz-tool-item" data-tool="reset" title="重置">
          <div class="kaz-image-craft-tool-icon">🔄</div>
        </div>
      </div>

        
        <div class="kaz-image-craft-modal-image-area">
          <img src="" id="kaz-preview-image" alt="${kazImageCraftLang.previewImage}" data-uuid="" data-name>
        </div>
      </div>
      
      <div class="kaz-image-craft-modal-image-list">
        <div class="kaz-image-list-container">
          
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(modal);


    modal.querySelector('.kaz-image-craft-modal-close').onclick =
      modal.querySelector('.kaz-image-craft-modal-backdrop').onclick = () => {
        modal.style.display = 'none';
      };


    modal.querySelectorAll('.kaz-tool-item').forEach(tool => {
      tool.onclick = () => {
        const toolType = tool.dataset.tool;
        if (toolType === 'crop') {
          this.toolsName = 'crop';
          this._enableCrop();
        }

        if (toolType === 'rotate') {
          this.toolsName = 'rotate';
          this._enableRotate();
        }

        if (toolType === 'reset') {
          this.toolsName = 'reset';
          this._resetImage();
        }
        if (toolType === 'flip-h') {
          this.toolsName = 'flip-h';
          this._flipImage('horizontal');
        }
        if (toolType === 'flip-v') {
          this.toolsName = 'flip-v';
          this._flipImage('vertical');
        }
      };
    });

    modal.querySelectorAll('.kaz-image-item').forEach(item => {
      item.onclick = () => {

        modal.querySelectorAll('.kaz-image-item').forEach(i => i.classList.remove('active'));

        item.classList.add('active');
        const index = item.dataset.index;

      };
    });

  }


  /**
   * Displays the image editing modal for a selected image.
   * @param {string} imgId - Unique ID of image.
   * @param {string} name - Name of the file input.
   * @private
   */
  _showImagePreviewModal(imgId, name) {
    this._createPreviewModal(); // make sure modal exists
    //const name = this.fileInput.name;
    const modal = document.getElementById('kaz-image-preview-modal');
    const img = document.getElementById('kaz-preview-image');
    img.src = document.getElementById(`img-preview-${name}-${imgId}`).src;
    img.dataset.uuid = imgId;
    img.dataset.name = name;
    modal.style.display = 'flex';
  }

  /**
   * Populates modal image list.
   * @param {Array} images
   * @param {string} name
   * @private
   */
  _addImageToKazListContainer(images, name) {
    if (!images) return;

    const container = document.querySelector('.kaz-image-list-container');
    container.innerHTML = '';

    images.forEach((img, idx) => {
      //const name = this.fileInput.name;
      const previewItem = document.createElement('div');
      previewItem.className = 'kaz-image-craft-image-preview-item';
      previewItem.dataset.id = img.id;
      previewItem.innerHTML = `
      <img id="img-${name}-${img.id}" src="${img.editedUrl}" alt="${img.file.name}" class="kaz-image-craft-image">
    `;

      container.appendChild(previewItem);

      previewItem.addEventListener('click', () => {
        container.querySelectorAll('.kaz-image-craft-image-preview-item')
          .forEach(item => item.classList.remove('active'));

        previewItem.classList.add('active');
        const kazPreviewImage = document.getElementById('kaz-preview-image');
        kazPreviewImage.src = img.editedUrl;
        kazPreviewImage.dataset.uuid = img.id;
        kazPreviewImage.dataset.name = name;

      });
    });
  }

  /**
   * Enables crop mode.
   * @private
   */
  _enableCrop() {
    const area = document.querySelector('.kaz-image-craft-modal-image-area');
    if (!area) return;

    if (this.cropBox) return;

    const box = document.createElement('div');
    box.className = 'kaz-image-craft-modal-crop-box';
    box.style.top = '50px';
    box.style.left = '50px';
    box.style.width = '200px';
    box.style.height = '200px';
    box.innerHTML = `
  <span class="kaz-crop-confirm">✔️</span>
  <span class="kaz-crop-cancel">✖️</span>
`;

    area.style.position = 'relative';
    area.appendChild(box);
    this.cropBox = box;
    box.querySelector('.kaz-crop-confirm').onclick = () => {
      this._applyCrop();
      box.remove();
    };

    box.querySelector('.kaz-crop-cancel').onclick = () => {
      box.remove();
    };

    ['nw', 'ne', 'sw', 'se'].forEach(dir => {
      const handle = document.createElement('div');
      handle.className = `crop-handle crop-handle-${dir}`;
      box.appendChild(handle);
    });


    this.cropBox.querySelectorAll('.crop-handle').forEach(handle => {
      handle.addEventListener('mousedown', e => {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const rect = this.cropBox.getBoundingClientRect();
        const dir = handle.className.match(/crop-handle-([a-z]+)/)[1];

        const onMouseMove = e => {
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;

          let newWidth = rect.width;
          let newHeight = rect.height;
          let newTop = rect.top;
          let newLeft = rect.left;

          if (dir.includes('e')) newWidth = rect.width + dx;
          if (dir.includes('s')) newHeight = rect.height + dy;
          if (dir.includes('w')) {
            newWidth = rect.width - dx;
            newLeft = rect.left + dx;
          }
          if (dir.includes('n')) {
            newHeight = rect.height - dy;
            newTop = rect.top + dy;
          }

          const parentRect = this.cropBox.parentElement.getBoundingClientRect();
          this.cropBox.style.width = newWidth + 'px';
          this.cropBox.style.height = newHeight + 'px';
          this.cropBox.style.left = (newLeft - parentRect.left) + 'px';
          this.cropBox.style.top = (newTop - parentRect.top) + 'px';
        };

        const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    });


    this._makeCropBoxDraggable(box);
  }


  /**
   * Applies cropping to selected image.
   * @private
   */
  _applyCrop() {
    if (!this.cropBox) return;
    const image = document.getElementById('kaz-preview-image');
    const imageRect = image.getBoundingClientRect();
    const cropRect = this.cropBox.getBoundingClientRect();

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const sx = (cropRect.left - imageRect.left) * scaleX;
    const sy = (cropRect.top - imageRect.top) * scaleY;
    const sw = cropRect.width * scaleX;
    const sh = cropRect.height * scaleY;

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
    const id = image.dataset.uuid;

    image.src = canvas.toDataURL();

    this.cropBox.remove();
    this.cropBox = null;

    const name = image.dataset.name;

    this.updateEditedImageUrl(id, name, canvas.toDataURL());
    //document.getElementById(`img-${name}-${id}`).src = canvas.toDataURL();
    //document.getElementById(`img-preview-${name}-${id}`).src = canvas.toDataURL();

  }

  /**
   * Makes crop box draggable.
   * @param {HTMLElement} box
   * @private
   */
  _makeCropBoxDraggable(box) {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    box.addEventListener('mousedown', e => {
      if (e.target !== box) return;
      isDragging = true;
      offsetX = e.offsetX;
      offsetY = e.offsetY;
      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const parent = box.parentElement;
      const rect = parent.getBoundingClientRect();
      let x = e.clientX - rect.left - offsetX;
      let y = e.clientY - rect.top - offsetY;

      x = Math.max(0, Math.min(x, parent.clientWidth - box.offsetWidth));
      y = Math.max(0, Math.min(y, parent.clientHeight - box.offsetHeight));

      box.style.left = `${x}px`;
      box.style.top = `${y}px`;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  /**
   * Enables rotation UI.
   * @private
   */
  _enableRotate() {
    const area = document.querySelector('.kaz-image-craft-modal-image-area');
    if (!area) return;

    if (this.rotateBox) {
      this.rotateBox.remove();
      this.rotateBox = null;
    }

    const box = document.createElement('div');
    box.className = 'kaz-image-craft-modal-rotate-box';
    box.innerHTML = `
      <span class="kaz-rotate-confirm" style="cursor:pointer;">✔️</span>
      <span class="kaz-rotate-cancel" style="cursor:pointer; margin-left:10px;">✖️</span>
      <div class="rotate-circle">
        <div class="rotate-center">+</div>
      </div>
    `;

    area.style.position = 'relative';
    area.appendChild(box);
    this.rotateBox = box;

    const image = document.getElementById('kaz-preview-image');
    if (!image) return;

    const imageRect = image.getBoundingClientRect();
    const areaRect = area.getBoundingClientRect();

    const relativeLeft = imageRect.left - areaRect.left;
    const relativeTop = imageRect.top - areaRect.top;

    const centerX = relativeLeft + imageRect.width / 2;
    const centerY = relativeTop + imageRect.height / 2;

    const rotateCircle = box.querySelector('.rotate-circle');
    const rotateCenterMark = box.querySelector('.rotate-center');

    Object.assign(rotateCircle.style, {
      position: 'absolute',
      width: '100px',
      height: '100px',
      border: '1px dashed rgba(153, 153, 153, 0.7)',
      borderRadius: '50%',
      left: `${centerX - 50}px`,
      top: `${centerY - 50}px`,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'grab',
      userSelect: 'none',
      backgroundColor: 'rgba(255, 255, 255, 0.6)',
      boxShadow: '0 0 5px rgba(255,255,255,0.5)',
    });

    Object.assign(rotateCenterMark.style, {
      width: '50px',
      height: '50px',
      textAlign: 'center',
      lineHeight: '50px',
      fontWeight: 'bold',
      color: 'red',
      cursor: 'move',
      userSelect: 'none',
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      borderRadius: '50%',
      boxShadow: '0 0 5px rgba(255,0,0,0.7)',
    });


    let rotateCenter = { x: centerX, y: centerY };
    let rotation = 0;
    let originalTransform = image.style.transform || '';

    rotateCenterMark.addEventListener('mousedown', e => {
      e.preventDefault();
      let startX = e.clientX;
      let startY = e.clientY;

      const onMouseMove = e => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        rotateCenter.x += dx;
        rotateCenter.y += dy;

        rotateCircle.style.left = `${rotateCenter.x - 50}px`;
        rotateCircle.style.top = `${rotateCenter.y - 50}px`;

        startX = e.clientX;
        startY = e.clientY;
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    rotateCircle.addEventListener('mousedown', e => {
      if (e.target === rotateCenterMark) return;
      e.preventDefault();

      const onMouseMove = e => {
        const cx = areaRect.left + rotateCenter.x;
        const cy = areaRect.top + rotateCenter.y;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        rotation = angle;

        const originX = rotateCenter.x - relativeLeft;
        const originY = rotateCenter.y - relativeTop;

        image.style.transformOrigin = `${originX}px ${originY}px`;
        image.style.transform = `rotate(${rotation}deg)`;
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });


    box.querySelector('.kaz-rotate-confirm').onclick = () => {
      this._applyRotationToCanvas(image, rotation, rotateCenter, relativeLeft, relativeTop);
      box.remove();
      this.rotateBox = null;
    };

    box.querySelector('.kaz-rotate-cancel').onclick = () => {
      image.style.transform = originalTransform;
      box.remove();
      this.rotateBox = null;
    };
  }

  /**
   * Applies rotation to canvas and updates image preview.
   * @private
   */
  _applyRotationToCanvas(image, rotation, rotateCenter, relativeLeft, relativeTop) {

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;

    const imageRect = image.getBoundingClientRect();
    const scaleX = naturalWidth / imageRect.width;
    const scaleY = naturalHeight / imageRect.height;

    canvas.width = naturalWidth;
    canvas.height = naturalHeight;

    // Convert rotation center to coordinates in the image's natural size
    const originX = (rotateCenter.x - relativeLeft) * scaleX;
    const originY = (rotateCenter.y - relativeTop) * scaleY;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Move the coordinate system to the rotation center
    ctx.translate(originX, originY);

    // Convert rotation angle from degrees to radians
    ctx.rotate((rotation * Math.PI) / 180);

    // Move back to canvas origin; when drawing the image, the top-left corner should be the negative rotation center coordinates
    ctx.drawImage(image, -originX, -originY, naturalWidth, naturalHeight);

    // Get the rotated image as a base64 data URL
    const dataURL = canvas.toDataURL();

    // Update the two image sources (read name and id from image.dataset)
    const name = image.dataset.name;
    const id = image.dataset.uuid || image.dataset.id || ''; // Replace with the actual field you use
    this.updateEditedImageUrl(id, name, dataURL);

    // Update the preview image's src and clear the transform style
    image.src = dataURL;
    image.style.transform = '';
  }


  /**
   * Enables image flip in given direction.
   * @param {'horizontal'|'vertical'} direction
   * @private
   */
  _flipImage(direction) {
    const image = document.getElementById('kaz-preview-image');
    if (!image) return;

    const id = image.dataset.uuid;
    const name = image.dataset.name;

    // Create a canvas and set its size
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const width = image.naturalWidth;
    const height = image.naturalHeight;
    canvas.width = width;
    canvas.height = height;

    ctx.save();

    if (direction === 'horizontal') {
      ctx.scale(-1, 1);
      ctx.drawImage(image, -width, 0);
    } else if (direction === 'vertical') {
      ctx.scale(1, -1);
      ctx.drawImage(image, 0, -height);
    }

    ctx.restore();


    const dataURL = canvas.toDataURL();

    image.src = dataURL;

    const img1 = document.getElementById(`img-${name}-${id}`);
    if (img1) img1.src = dataURL;

    const img2 = document.getElementById(`img-preview-${name}-${id}`);
    if (img2) img2.src = dataURL;
  }

  /**
   * Resets edited image to original preview.
   * @private
   */
  _resetImage() {
    const previewImg = document.getElementById('kaz-preview-image');
    if (!previewImg) return;

    const uuid = previewImg.dataset.uuid;
    const name = previewImg.dataset.name;

    if (!uuid || !name) return;

    const imgId = `img-${name}-${uuid}`;
    const imgPreviewId = `img-preview-${name}-${uuid}`;

    const originalImg = document.getElementById(imgPreviewId);
    if (!originalImg) return;

    const originalSrc = originalImg.dataset.originalsrc;
    if (!originalSrc) return;

    // warning
    if (!confirm(kazImageCraftLang.resetWarning)) return;



    // reset 
    const imageObj = KazImageCraft.uploadedImages[name].find(img => img.id === uuid);

    this.updateEditedImageUrl(uuid, name, imageObj.previewUrl);
    previewImg.src = originalSrc;

    const mainImg = document.getElementById(imgId);
    if (mainImg) mainImg.src = originalSrc;

    originalImg.src = originalSrc;
  }

  /**
   * Updates image preview and editedUrl in global image list.
   * @param {string} id
   * @param {string} name
   * @param {string} srcurl
   */
  updateEditedImageUrl(id, name, srcurl) {
    //console.log('updateEditedImageUrl', id, name, srcurl);
    if (!KazImageCraft.uploadedImages[name]) return;

    const imageObj = KazImageCraft.uploadedImages[name].find(img => img.id === id);
    if (imageObj) {
      imageObj.editedUrl = srcurl;
    } else {
      console.warn(`Image with id=${id} not found in uploadedImages[${name}]`);
      return;
    }


    const img1 = document.getElementById(`img-${name}-${id}`);
    if (img1) img1.src = srcurl;

    const img2 = document.getElementById(`img-preview-${name}-${id}`);
    if (img2) img2.src = srcurl;
  }


/**
 * Loads existing images from URLs by fetching them as Blob objects,
 * converts to File instances with proper names and MIME types,
 * and stores them in the uploadedImages collection.
 * 
 * @param {string} name - The input name key for grouping images.
 * @param {string[]} urls - Array of image URLs to load.
 * @returns {Promise<void>} - Resolves when all files are loaded and stored.
 * 
 * Usage:
 * await kazImageCraftInstance._loadExistingFiles('myInputName', [
 *   'http://example.com/image1.jpg',
 *   'http://example.com/photo.png'
 * ]);
 */
async _loadExistingFiles(name, urls) {
  if (!KazImageCraft.uploadedImages[name]) {
    KazImageCraft.uploadedImages[name] = [];
  }

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch image at ${url}`);
        continue;
      }
      const blob = await response.blob();

      // Extract extension from URL, fallback to 'png' if missing
      let extMatch = url.match(/\.(\w+)(?:\?|#|$)/);
      let ext = extMatch ? extMatch[1].toLowerCase() : 'png';

      // Construct file name with matching extension
      const fileName = `existing_${i + 1}.${ext}`;

      // Create File object with blob data and MIME type
      const file = new File([blob], fileName, { type: blob.type });

      const id = crypto.randomUUID();

      KazImageCraft.uploadedImages[name].push({
        id,
        file,
        previewUrl: url,
        editedUrl: url
      });
    } catch (error) {
      console.warn(`Error loading image from ${url}:`, error);
    }
  }
  this._renderPreview(name);
}

  

}


