(function(factory) {
  typeof define === "function" && define.amd ? define(factory) : factory();
})(function() {
  "use strict";var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  /**
   * KazImageCraft.js
   *
   * Provides image preview, editing (crop, rotate, flip), and drag-and-drop reordering.
   * Designed for integration into forms with dynamic UI updates.
   *
   * @version 1.4
   * @author Y D <y@9.kz>
   * @website https://www.kazcms.com/en-us/kaz-image-craft
   * @license MIT
   */
  const CONSTANTS = {
    DEFAULT_CROP_SIZE: 200,
    DEFAULT_ROTATE_CIRCLE_SIZE: 100,
    DEFAULT_OUTPUT_FORMAT: "image/webp",
    DEFAULT_QUALITY: 1,
    MOBILE_BREAKPOINT: 768,
    MAX_RETRY_ATTEMPTS: 3,
    DEBOUNCE_DELAY: 300,
    // Image compression settings
    COMPRESSION: {
      MAX_FILE_SIZE: 2 * 1024 * 1024,
      // 2MB default
      MAX_WIDTH: 1920,
      MAX_HEIGHT: 1080,
      QUALITY_STEP: 0.1,
      MIN_QUALITY: 0.1,
      RESIZE_STEP: 0.9
    },
    // CSS Classes
    CLASSES: {
      WRAPPER: "kaz-image-craft-wrapper",
      PREVIEW_ITEM: "kaz-image-craft-preview-item",
      IMAGE: "kaz-image-craft-image",
      DELETE_BTN: "kaz-image-craft-delete-btn",
      MOVE_UP: "kaz-image-craft-move-up",
      MOVE_DOWN: "kaz-image-craft-move-down",
      DRAGGING: "kaz-image-craft-dragging",
      DRAG_OVER: "kaz-image-craft-drag-over",
      MODAL: "kaz-image-craft-modal",
      CROP_BOX: "kaz-image-craft-modal-crop-box",
      ROTATE_BOX: "kaz-image-craft-modal-rotate-box",
      COMPRESS_BOX: "kaz-image-craft-modal-compress-box"
    },
    // Event types
    EVENTS: {
      TOUCH_START: "touchstart",
      TOUCH_MOVE: "touchmove",
      TOUCH_END: "touchend",
      MOUSE_DOWN: "mousedown",
      MOUSE_MOVE: "mousemove",
      MOUSE_UP: "mouseup"
    }
  };
  const Lang = {
    // Default English messages
    messages: {
      duplicate: (filename) => `File "${filename}" already exists. Do you want to add it anyway?`,
      removeImage: "Remove image",
      dragDropHint: "Click to select files or drag and drop here",
      rotateAndFlip: "Rotate and Flip",
      reset: "Reset to original",
      download: "Download image",
      previewImage: "Preview image",
      discardEdits: "You have unsaved edits. Do you want to discard them?",
      resetWarning: "Are you sure you want to reset this image to its original state?",
      maxImagesExceeded: (max, current) => `Maximum ${max} images allowed. You already uploaded ${current}.`,
      noImageToDownload: "No image to download",
      cropSizeDisplay: (width, height) => `${Math.round(width)}px × ${Math.round(height)}px`,
      // Compression messages
      compressImage: "Compress Image",
      compressionSettings: "Compression Settings",
      resizeByDimensions: "Resize by Dimensions",
      resizeByFileSize: "Resize by File Size",
      maxWidth: "Max Width",
      maxHeight: "Max Height",
      maxFileSize: "Max File Size",
      currentSize: "Current Size",
      targetSize: "Target Size",
      quality: "Quality",
      pixels: "px",
      percentage: "%",
      megabytes: "MB",
      kilobytes: "KB",
      bytes: "bytes",
      apply: "Apply",
      cancel: "Cancel",
      compressing: "Compressing...",
      compressionComplete: "Compression complete",
      compressionFailed: "Compression failed",
      fileSizeReduced: (original, compressed, reduction) => `File size reduced from ${original} to ${compressed} (${reduction}% reduction)`,
      dimensionsChanged: (oldW, oldH, newW, newH) => `Dimensions changed from ${oldW}×${oldH} to ${newW}×${newH}`,
      noCompressionNeeded: "Image is already within the specified limits"
    },
    /**
     * Get localized message
     * @param {string} key - Message key
     * @param {...any} args - Arguments for message formatting
     * @returns {string}
     */
    get(key, ...args) {
      const message = this.messages[key];
      return typeof message === "function" ? message(...args) : message || key;
    },
    /**
     * Set custom language messages
     * @param {Object} customMessages - Custom message object
     */
    setMessages(customMessages) {
      this.messages = { ...this.messages, ...customMessages };
    }
  };
  window.kazImageCraftLang = Lang;
  const Utils = {
    /**
     * Check if device supports touch events
     * @returns {boolean}
     */
    isTouchDevice() {
      return "ontouchstart" in window || navigator.maxTouchPoints > 0;
    },
    /**
     * Check if device is mobile based on screen width
     * @returns {boolean}
     */
    isMobile() {
      return window.innerWidth <= CONSTANTS.MOBILE_BREAKPOINT;
    },
    /**
     * Generate UUID v4
     * @returns {string}
     */
    generateUUID() {
      if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : r & 3 | 8;
        return v.toString(16);
      });
    },
    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function}
     */
    debounce(func, wait = CONSTANTS.DEBOUNCE_DELAY) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },
    /**
     * Clean up blob URLs to prevent memory leaks
     * @param {string} url - Blob URL to revoke
     */
    revokeBlobUrl(url) {
      if (url && url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    },
    /**
     * Safely get element by ID with error handling
     * @param {string} id - Element ID
     * @returns {HTMLElement|null}
     */
    getElementById(id) {
      try {
        return document.getElementById(id);
      } catch (error) {
        console.warn(`Element with ID "${id}" not found:`, error);
        return null;
      }
    },
    /**
     * Format file size in human readable format
     * @param {number} bytes - File size in bytes
     * @returns {string}
     */
    formatFileSize(bytes) {
      if (bytes === 0) return "0 " + Lang.get("bytes");
      const k = 1024;
      const sizes = [
        Lang.get("bytes"),
        Lang.get("kilobytes"),
        Lang.get("megabytes"),
        "GB",
        "TB"
      ];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
      return size + " " + sizes[i];
    },
    /**
     * Parse size string to pixels
     * @param {string} sizeStr - Size string (e.g., "100px", "50%", "100")
     * @param {number} referenceSize - Reference size for percentage calculations
     * @returns {number}
     */
    parseSizeToPixels(sizeStr, referenceSize = 0) {
      if (typeof sizeStr === "number") return sizeStr;
      const str = String(sizeStr).trim();
      if (!str) return 0;
      if (str.endsWith("%")) {
        const percentage = parseFloat(str);
        return Math.round(percentage / 100 * referenceSize);
      }
      if (str.endsWith("px")) {
        return parseInt(str);
      }
      return parseInt(str) || 0;
    },
    /**
     * Parse file size string to bytes
     * @param {string} sizeStr - Size string (e.g., "2MB", "500KB", "1024")
     * @returns {number}
     */
    parseSizeToBytes(sizeStr) {
      if (typeof sizeStr === "number") return sizeStr;
      const str = String(sizeStr).trim().toUpperCase();
      if (!str) return 0;
      const value = parseFloat(str);
      if (isNaN(value)) return 0;
      if (str.includes("GB")) return value * 1024 * 1024 * 1024;
      if (str.includes("MB")) return value * 1024 * 1024;
      if (str.includes("KB")) return value * 1024;
      return value;
    },
    /**
     * Calculate optimal canvas dimensions while maintaining aspect ratio
     * @param {number} originalWidth - Original width
     * @param {number} originalHeight - Original height
     * @param {number} maxWidth - Maximum width
     * @param {number} maxHeight - Maximum height
     * @returns {Object} - {width, height, scale}
     */
    calculateOptimalDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
      if (!maxWidth && !maxHeight) {
        return { width: originalWidth, height: originalHeight, scale: 1 };
      }
      let scaleX = maxWidth ? maxWidth / originalWidth : 1;
      let scaleY = maxHeight ? maxHeight / originalHeight : 1;
      const scale = Math.min(scaleX, scaleY, 1);
      return {
        width: Math.round(originalWidth * scale),
        height: Math.round(originalHeight * scale),
        scale
      };
    },
    /**
     * Create element with attributes and classes
     * @param {string} tagName - HTML tag name
     * @param {Object} options - Element options
     * @param {string|Array<string>} options.className - CSS classes
     * @param {Object} options.attributes - HTML attributes
     * @param {string} options.innerHTML - Inner HTML content
     * @returns {HTMLElement}
     */
    createElement(tagName, options = {}) {
      const element = document.createElement(tagName);
      if (options.className) {
        const classes = Array.isArray(options.className) ? options.className : [options.className];
        element.classList.add(...classes);
      }
      if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
          element.setAttribute(key, value);
        });
      }
      if (options.innerHTML) {
        element.innerHTML = options.innerHTML;
      }
      return element;
    }
  };
  const _KazImageCraft = class _KazImageCraft {
    /**
     * @constructor
     * @param {HTMLInputElement} fileInput - The original file input element.
     * @param {HTMLElement} previewContainer - Container for image preview items.
     * @param {HTMLFormElement} form - Form element to bind submit events.
     * @param {string} [orderInputName='image_order'] - Name for hidden input fields tracking image order.
     * @param {Object} [config={}] - Configuration options.
     */
    constructor(fileInput, previewContainer, form, orderInputName = "image_order", config = {}) {
      this.fileInput = fileInput;
      this.previewContainer = previewContainer;
      this.form = form;
      this.orderInputName = orderInputName;
      this.config = { ..._KazImageCraft.globalConfig, ...config };
      this.dragSrcEl = null;
      this.toolsName = "";
      this.isEditing = false;
      this.cropBox = null;
      this.rotateBox = null;
      this.format = this.config.outputFormat || CONSTANTS.DEFAULT_OUTPUT_FORMAT;
      this.ext = this.format.split("/")[1];
      this.quality = this.config.quality || CONSTANTS.QUALITY;
      this.isMobile = Utils.isMobile();
      this.isTouch = Utils.isTouchDevice();
      this.eventCleanupFunctions = [];
      this._handleFiles = this._handleFiles.bind(this);
      this._injectFiles = this._injectFiles.bind(this);
    }
    /**
     * Initializes all file inputs and binds KazImageCraft instances to them.
     * @param {Object} options - Configuration options
     * @param {string} options.fileInputClass - CSS class for file inputs
     * @param {string} options.formClass - CSS class for forms
     * @param {Array<string>} options.editableImgClass - CSS classes for editable images
     * @param {Array<string>} options.scanClass - CSS classes to scan for
     * @param {boolean} options.showPreview - Whether to show preview
     * @returns {Promise<void>}
     */
    static async _init(options = {}) {
      const defaults = {
        fileInputClass: "",
        formClass: "",
        editableImgClass: [],
        // Classes to match on img itself
        scanClass: [],
        showPreview: true,
        outputFormat: CONSTANTS.DEFAULT_OUTPUT_FORMAT,
        quality: CONSTANTS.DEFAULT_QUALITY
      };
      const config = { ...defaults, ...options };
      _KazImageCraft.globalConfig = config;
      try {
        if (config.formClass) {
          await _KazImageCraft._initUploadMode(config);
        }
        if (config.editableImgClass.length && config.scanClass.length) {
          await _KazImageCraft._initHtmlEditMode(config);
        }
      } catch (error) {
        console.error("Failed to initialize KazImageCraft:", error);
        throw error;
      }
    }
    /**
     * Initialize upload mode for file inputs
     * @param {Object} config - Configuration object
     * @private
     */
    static async _initUploadMode(config) {
      const forms = document.querySelectorAll(`form.${config.formClass}`);
      for (const form of forms) {
        const inputs = form.querySelectorAll(`input.${config.fileInputClass}[type="file"]`);
        for (const input of inputs) {
          if (input.dataset.kazInit === "1") continue;
          input.dataset.kazInit = "1";
          const previewContainer = _KazImageCraft._getOrCreatePreviewContainer(input, form, config);
          const orderInputName = "image_order_" + input.name.replace(/\W+/g, "_");
          const uploader = new _KazImageCraft(input, previewContainer, form, orderInputName, config);
          await uploader._bind();
          _KazImageCraft.instances.push(uploader);
        }
      }
    }
    /**
     * Initialize HTML edit mode for existing images
     * @param {Object} config - Configuration object
     * @private
     */
    static async _initHtmlEditMode(config) {
      const selector = config.scanClass.map((c) => `.${c}`).join("");
      const wrappers = document.querySelectorAll(selector);
      for (const wrapper of wrappers) {
        const previewContainer = document.getElementById(wrapper.dataset.preview);
        if (!previewContainer) continue;
        const imgs = _KazImageCraft._collectEditableImages(wrapper, config.editableImgClass);
        if (!imgs.length) continue;
        const name = wrapper.dataset.preview.replace("preview-container-", "");
        if (!_KazImageCraft.uploadedImages[name]) {
          _KazImageCraft.uploadedImages[name] = [];
        }
        const existingFiles = imgs.map((img) => ({
          id: Utils.generateUUID(),
          previewUrl: img.src,
          editedUrl: img.src,
          originalFile: img,
          file: new File([], img.getAttribute("name") || img.src.split("/").pop()),
          element: img,
          container: wrapper
        }));
        const tempUploader = new _KazImageCraft(null, previewContainer, null, `${name}_order`, config);
        tempUploader.htmlModeName = name;
        await tempUploader._bind({ existingFiles, isHtmlMode: true, htmlModeName: name });
        _KazImageCraft.instances.push(tempUploader);
      }
    }
    /**
     * Get or create preview container for file input
     * @param {HTMLInputElement} input - File input element
     * @param {HTMLFormElement} form - Form element
     * @param {Object} config - Configuration object
     * @returns {HTMLElement|null}
     * @private
     */
    static _getOrCreatePreviewContainer(input, form, config) {
      if (!config.showPreview) return null;
      let previewContainer = input.dataset.preview ? document.getElementById(input.dataset.preview) : form.querySelector(".kaz-image-craft-preview-container");
      if (!previewContainer) {
        const safeId = "PreviewContainer_" + input.name.replace(/\W+/g, "_");
        previewContainer = document.createElement("div");
        previewContainer.id = safeId;
        previewContainer.classList.add("kaz-preview-container");
        input.parentNode.insertBefore(previewContainer, input.nextSibling);
      }
      return previewContainer;
    }
    /**
     * Collect editable images from wrapper element
     * @param {HTMLElement} wrapper - Wrapper element
     * @param {Array<string>} editableImgClass - CSS classes for editable images
     * @returns {Array<HTMLImageElement>}
     * @private
     */
    static _collectEditableImages(wrapper, editableImgClass) {
      let imgs = Array.from(wrapper.querySelectorAll("img"));
      for (const cls of editableImgClass) {
        imgs = imgs.filter((img) => img.classList.contains(cls) || img.closest(`.${cls}`));
      }
      return imgs;
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
      _KazImageCraft.instances.forEach((uploader) => {
        try {
          uploader._injectFiles();
        } catch (error) {
          console.error("Error injecting files for uploader:", error);
        }
      });
    }
    /**
     * Clean up all instances and their resources
     * @static
     */
    static cleanupAll() {
      _KazImageCraft.instances.forEach((instance) => {
        try {
          instance.cleanup();
        } catch (error) {
          console.error("Error cleaning up instance:", error);
        }
      });
      _KazImageCraft.instances = [];
      _KazImageCraft.uploadedImages = {};
    }
    /**
     * Get instance by input name or HTML mode name
     * @param {string} name - Input name or HTML mode name
     * @returns {KazImageCraft|null}
     * @static
     */
    static getInstance(name) {
      return _KazImageCraft.instances.find(
        (instance) => {
          var _a;
          return ((_a = instance.fileInput) == null ? void 0 : _a.name) === name || instance.htmlModeName === name;
        }
      ) || null;
    }
    /**
     * Binds events for file input and form submission. Also handles existing image population.
     * @param {Object} options - Binding options
     * @param {Array} options.existingFiles - Existing files to load
     * @param {boolean} options.isHtmlMode - Whether in HTML editing mode
     * @param {string} options.HtmlModeName - Name for HTML mode
     * @private
     */
    async _bind({ existingFiles = [], isHtmlMode = false, HtmlModeName = "" } = {}) {
      var _a, _b;
      try {
        this.isHtmlMode = isHtmlMode;
        if (!isHtmlMode) {
          this._createWrapper();
          this._bindFileInputEvents();
        }
        const name = ((_a = this.fileInput) == null ? void 0 : _a.name) || HtmlModeName;
        if (!name) {
          throw new Error("No input name or HTML mode name provided");
        }
        if (!isHtmlMode && ((_b = this.fileInput) == null ? void 0 : _b.dataset.targetExisting)) {
          await this._loadExistingFilesFromInput(name);
        }
        if (isHtmlMode && existingFiles.length) {
          this._loadExistingFilesFromArray(name, existingFiles);
        }
        if (typeof this._renderPreview === "function") {
          this._renderPreview(name);
        }
      } catch (error) {
        console.error("Error binding KazImageCraft:", error);
        throw error;
      }
    }
    /**
     * Bind file input events
     * @private
     */
    _bindFileInputEvents() {
      if (!this.fileInput) return;
      const changeHandler = (e) => this._handleFiles(e.target.files);
      this.fileInput.addEventListener("change", changeHandler);
      this.eventCleanupFunctions.push(() => {
        this.fileInput.removeEventListener("change", changeHandler);
      });
      if (this.form) {
        const submitHandler = () => this._injectFiles();
        this.form.addEventListener("submit", submitHandler);
        this.eventCleanupFunctions.push(() => {
          this.form.removeEventListener("submit", submitHandler);
        });
      }
    }
    /**
     * Load existing files from hidden input
     * @param {string} name - Input name
     * @private
     */
    async _loadExistingFilesFromInput(name) {
      const hiddenInput = document.querySelector(this.fileInput.dataset.targetExisting);
      if (!hiddenInput || !hiddenInput.value.trim()) return;
      try {
        let value = hiddenInput.value.trim();
        if (value.startsWith("[") && value.includes("'")) {
          value = value.replace(/'/g, '"');
        }
        const urls = JSON.parse(value);
        if (Array.isArray(urls) && urls.length > 0) {
          await this._loadExistingFiles(name, urls);
        }
      } catch (error) {
        console.warn("Invalid existing image data:", hiddenInput.value, error);
      }
    }
    /**
     * Load existing files from array (HTML mode)
     * @param {string} name - Input name
     * @param {Array} existingFiles - Array of existing file objects
     * @private
     */
    _loadExistingFilesFromArray(name, existingFiles) {
      this.htmlModeName = name;
      if (!_KazImageCraft.uploadedImages[name]) {
        _KazImageCraft.uploadedImages[name] = [];
      }
      existingFiles.forEach((img) => {
        if (!img.id || !img.file) {
          console.warn("Invalid image object:", img);
          return;
        }
        _KazImageCraft.uploadedImages[name].push(img);
      });
    }
    /**
     * Handles dropped or selected files, checks duplicates and max limits.
     * @param {FileList} files - The list of selected files.
     * @private
     */
    _handleFiles(files) {
      const name = this.fileInput.name;
      if (!_KazImageCraft.uploadedImages[name]) {
        _KazImageCraft.uploadedImages[name] = [];
      }
      try {
        const validationResult = this._validateFiles(files, name);
        if (!validationResult.isValid) {
          alert(validationResult.message);
          this.fileInput.value = "";
          return;
        }
        const processedFiles = this._processValidFiles(validationResult.validFiles, name);
        if (processedFiles.length > 0) {
          this._renderPreview(name);
        }
      } catch (error) {
        console.error("Error handling files:", error);
        alert("An error occurred while processing the files. Please try again.");
      } finally {
        this.fileInput.value = "";
      }
    }
    /**
     * Validate files against constraints
     * @param {FileList} files - Files to validate
     * @param {string} name - Input name
     * @returns {Object} Validation result
     * @private
     */
    _validateFiles(files, name) {
      const max = parseInt(this.fileInput.dataset.max || "0", 10);
      const currentCount = _KazImageCraft.uploadedImages[name].length;
      const newFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (max > 0 && currentCount + newFiles.length > max) {
        return {
          isValid: false,
          message: Lang.get("maxImagesExceeded", max, currentCount)
        };
      }
      const maxSize = parseInt(this.fileInput.dataset.maxSize || "0", 10);
      if (maxSize > 0) {
        const oversizedFiles = newFiles.filter((file) => file.size > maxSize);
        if (oversizedFiles.length > 0) {
          return {
            isValid: false,
            message: `Some files are too large. Maximum file size is ${this._formatFileSize(maxSize)}.`
          };
        }
      }
      return {
        isValid: true,
        validFiles: newFiles
      };
    }
    /**
     * Process valid files and add them to the collection
     * @param {Array<File>} files - Valid files to process
     * @param {string} name - Input name
     * @returns {Array} Processed files
     * @private
     */
    _processValidFiles(files, name) {
      const processedFiles = [];
      files.forEach((file) => {
        const duplicate = _KazImageCraft.uploadedImages[name].some(
          (img) => img.file.name === file.name && img.file.size === file.size
        );
        if (duplicate) {
          const proceed = confirm(Lang.get("duplicate", file.name));
          if (!proceed) return;
        }
        const id = Utils.generateUUID();
        const previewUrl = URL.createObjectURL(file);
        const imageData = {
          id,
          file,
          previewUrl,
          editedUrl: previewUrl,
          originalFile: file
        };
        _KazImageCraft.uploadedImages[name].push(imageData);
        processedFiles.push(imageData);
      });
      return processedFiles;
    }
    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     * @private
     */
    _formatFileSize(bytes) {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }
    /**
     * Renders image thumbnails in the preview container.
     * @param {string} name - The name of the file input.
     * @private
     */
    _renderPreview(name) {
      if (!this.previewContainer) return;
      this.previewContainer.innerHTML = "";
      const list = _KazImageCraft.uploadedImages[name] || [];
      if (list.length === 0) return;
      const fragment = document.createDocumentFragment();
      list.forEach((img, idx) => {
        const previewItem = this._createPreviewItem(img, idx, name, list);
        fragment.appendChild(previewItem);
      });
      this.previewContainer.appendChild(fragment);
      this._updateOrderInputs();
    }
    /**
     * Create a single preview item element
     * @param {Object} img - Image data object
     * @param {number} idx - Index in the list
     * @param {string} name - Input name
     * @param {Array} list - Full image list
     * @returns {HTMLElement}
     * @private
     */
    _createPreviewItem(img, idx, name, list) {
      var _a;
      const div = Utils.createElement("div", {
        className: CONSTANTS.CLASSES.PREVIEW_ITEM,
        attributes: {
          "data-id": img.id,
          "data-img-id": ((_a = img.originalFile) == null ? void 0 : _a.id) || "",
          "draggable": !this.isMobile
        }
      });
      const imageBox = this._createImageBox(img, idx, name);
      const imageName = Utils.createElement("div", {
        className: "kaz-image-craft-image-name",
        innerHTML: img.file.name
      });
      const controls = this._createControls(idx, list.length, name, div);
      div.appendChild(imageBox);
      div.appendChild(imageName);
      div.appendChild(controls);
      if (!this.isMobile) {
        this._addDragAndDropEvents(div);
      }
      return div;
    }
    /**
     * Create image box with image and delete button
     * @param {Object} img - Image data
     * @param {number} idx - Index
     * @param {string} name - Input name
     * @returns {HTMLElement}
     * @private
     */
    _createImageBox(img, idx, name) {
      var _a;
      const imageBox = Utils.createElement("div", {
        className: "kaz-image-craft-image-box"
      });
      const image = Utils.createElement("img", {
        attributes: {
          id: `img-preview-${name}-${img.id}`,
          src: img.editedUrl,
          alt: img.file.name,
          "data-uuid": `${name}-${img.id}`,
          "data-order": idx,
          "data-original-id": ((_a = img.originalFile) == null ? void 0 : _a.id) || "",
          "data-originalSrc": img.previewUrl
        },
        className: CONSTANTS.CLASSES.IMAGE
      });
      const deleteBtn = Utils.createElement("button", {
        className: CONSTANTS.CLASSES.DELETE_BTN,
        attributes: {
          type: "button",
          "aria-label": Lang.get("removeImage")
        },
        innerHTML: "×"
      });
      image.addEventListener("click", () => {
        this._showImagePreviewModal(img.id, name);
        this._addImageToKazListContainer(_KazImageCraft.uploadedImages[name], name);
      });
      deleteBtn.addEventListener("click", () => {
        this._removeImage(name, idx);
      });
      imageBox.appendChild(image);
      imageBox.appendChild(deleteBtn);
      return imageBox;
    }
    /**
     * Create control buttons for image reordering
     * @param {number} idx - Current index
     * @param {number} totalLength - Total number of images
     * @param {string} name - Input name
     * @param {HTMLElement} div - Container div
     * @returns {HTMLElement}
     * @private
     */
    _createControls(idx, totalLength, name, div) {
      const controls = Utils.createElement("div", {
        className: "kaz-image-craft-controls"
      });
      const moveUpBtn = Utils.createElement("button", {
        className: CONSTANTS.CLASSES.MOVE_UP,
        attributes: { type: "button" },
        innerHTML: "⬅️"
      });
      const moveDownBtn = Utils.createElement("button", {
        className: CONSTANTS.CLASSES.MOVE_DOWN,
        attributes: { type: "button" },
        innerHTML: "➡️"
      });
      moveUpBtn.style.display = idx === 0 ? "none" : "";
      moveDownBtn.style.display = idx === totalLength - 1 ? "none" : "";
      moveUpBtn.addEventListener("click", () => this._moveImage(name, div, "up"));
      moveDownBtn.addEventListener("click", () => this._moveImage(name, div, "down"));
      controls.appendChild(moveUpBtn);
      controls.appendChild(moveDownBtn);
      return controls;
    }
    /**
     * Remove image from collection and re-render
     * @param {string} name - Input name
     * @param {number} idx - Index to remove
     * @private
     */
    _removeImage(name, idx) {
      var _a;
      const list = _KazImageCraft.uploadedImages[name];
      if (!list || idx < 0 || idx >= list.length) return;
      const img = list[idx];
      if (img.previewUrl) {
        Utils.revokeBlobUrl(img.previewUrl);
      }
      if (img.editedUrl && img.editedUrl !== img.previewUrl) {
        Utils.revokeBlobUrl(img.editedUrl);
      }
      list.splice(idx, 1);
      this._renderPreview(name);
      const removeLevel = ((_a = this.config) == null ? void 0 : _a.removeLevel) ?? 0;
      this._syncHtmlImagesByPreview(name, idx, removeLevel);
    }
    /**
     * Add drag and drop event listeners to an element
     * @param {HTMLElement} element - Element to add events to
     * @private
     */
    _addDragAndDropEvents(element) {
      const events = [
        { type: "dragstart", handler: this._handleDragStart.bind(this) },
        { type: "dragover", handler: this._handleDragOver.bind(this) },
        { type: "dragleave", handler: this._handleDragLeave.bind(this) },
        { type: "drop", handler: this._handleDrop.bind(this) },
        { type: "dragend", handler: this._handleDragEnd.bind(this) }
      ];
      events.forEach(({ type, handler }) => {
        element.addEventListener(type, handler);
        this.eventCleanupFunctions.push(() => {
          element.removeEventListener(type, handler);
        });
      });
    }
    /**
     * Clean up all event listeners
     * @public
     */
    cleanup() {
      this.eventCleanupFunctions.forEach((cleanup) => cleanup());
      this.eventCleanupFunctions = [];
      Object.values(_KazImageCraft.uploadedImages).flat().forEach((img) => {
        if (img.previewUrl) Utils.revokeBlobUrl(img.previewUrl);
        if (img.editedUrl && img.editedUrl !== img.previewUrl) {
          Utils.revokeBlobUrl(img.editedUrl);
        }
      });
    }
    _moveImage(name, div, direction) {
      const parent = div.parentElement;
      const target = direction === "up" ? div.previousElementSibling : div.nextElementSibling;
      if (!target) return;
      if (direction === "up") {
        parent.insertBefore(div, target);
      } else {
        parent.insertBefore(target, div);
      }
      this._reorderImagesByDOM();
      this._renderPreview(name);
      this._syncHtmlImagesByPreview(name);
    }
    /**
     * Injects temporary hidden file inputs into the form before submit.
     * @private
     */
    _injectFiles() {
      if (!this.wrapper) return;
      this.wrapper.querySelectorAll(".temp-file-input").forEach((el) => el.remove());
      const name = this.fileInput.name;
      const list = _KazImageCraft.uploadedImages[name] || [];
      list.forEach((img) => {
        if (!img.file) return;
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.name = name.endsWith("[]") ? name : name + "[]";
        fileInput.classList.add("temp-file-input");
        fileInput.style.display = "none";
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
      var _a;
      const name = this.isHtmlMode ? this.htmlModeName : (_a = this.fileInput) == null ? void 0 : _a.name;
      if (!name) return;
      const list = _KazImageCraft.uploadedImages[name] || [];
      this.previewContainer.querySelectorAll(".kaz-image-craft-preview-item").forEach((div, idx) => {
        const id = parseInt(div.dataset.id, 10);
        const img = list.find((i) => i.id === id);
        if (img) img.order = idx;
      });
      if (this.isHtmlMode) return;
      if (!this.form) return;
      this.form.querySelectorAll(`input[name^="${this.orderInputName}"]`).forEach((el) => el.remove());
      list.forEach((_, idx) => {
        const input = document.createElement("input");
        input.type = "hidden";
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
      this.dragSrcEl.classList.add("kaz-image-craft-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "");
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
        el.classList.add("kaz-image-craft-drag-over");
      }
    }
    /**
     * Removes visual indicator during drag leave.
     * @param {DragEvent} e
     * @private
     */
    _handleDragLeave(e) {
      e.currentTarget.classList.remove("kaz-image-craft-drag-over");
    }
    _updateMoveButtons() {
      const items = Array.from(this.previewContainer.children);
      items.forEach((item, index) => {
        const upBtn = item.querySelector(".kaz-image-craft-move-up");
        const downBtn = item.querySelector(".kaz-image-craft-move-down");
        if (!upBtn || !downBtn) return;
        upBtn.style.display = "";
        downBtn.style.display = "";
        if (index === 0) {
          upBtn.style.display = "none";
        }
        if (index === items.length - 1) {
          downBtn.style.display = "none";
        }
      });
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
      el.classList.remove("kaz-image-craft-drag-over");
      this.dragSrcEl.classList.remove("kaz-image-craft-dragging");
      this.dragSrcEl = null;
      this._updateMoveButtons();
      if (this.isHtmlMode) {
        this._syncHtmlImagesByPreview(this.htmlModeName);
      }
    }
    _syncHtmlImagesByPreview(name, idx = null, removeLevel = 1) {
      console.log("syncHtmlImagesByPreview", name, idx, removeLevel);
      const list = _KazImageCraft.uploadedImages[name] || [];
      if (!this.config) return;
      const config = this.config;
      console.log("config", config);
      console.log("name", name);
      const wrapper = document.getElementById(`kaz-editor-content-${name}`);
      if (!wrapper) {
        console.warn(`[KazImageCraft] No editor wrapper found for id kaz-editor-content-${name}`);
        return;
      }
      console.log("wrapper", wrapper);
      const htmlImgs = Array.from(wrapper.querySelectorAll("img"));
      if (idx !== null && idx >= 0 && idx < htmlImgs.length) {
        let target = htmlImgs[idx];
        for (let i = 0; i < removeLevel && target; i++) {
          target = target.parentElement;
        }
        if (target) {
          console.log(`🗑 Removing img index ${idx} (level ${removeLevel})`, target);
          target.remove();
        }
      }
      const newImgs = Array.from(wrapper.querySelectorAll("img"));
      console.log("newImgs", newImgs);
      newImgs.forEach((imgEl, i) => {
        const imgData = list[i];
        if (!imgData) return;
        imgEl.src = imgData.editedUrl;
        imgEl.alt = imgData.file.name;
        imgEl.dataset.uuid = `${name}-${imgData.id}`;
        imgEl.dataset.order = i;
      });
    }
    /**
     * Clears drag-related styles.
     * @private
     */
    _handleDragEnd() {
      this.previewContainer.querySelectorAll(".kaz-image-craft-preview-item").forEach((item) => {
        item.classList.remove("kaz-image-craft-dragging", "kaz-image-craft-drag-over");
      });
      this.dragSrcEl = null;
    }
    /**
     * Reorders internal list of images based on preview container DOM order.
     * @private
     */
    _reorderImagesByDOM() {
      const name = this.isHtmlMode ? this.htmlModeName : this.fileInput.name;
      const list = _KazImageCraft.uploadedImages[name] || [];
      const newOrder = [];
      this.previewContainer.querySelectorAll(".kaz-image-craft-preview-item").forEach((div) => {
        const id = div.dataset.id;
        const img = list.find((i) => i.id === id);
        if (img) newOrder.push(img);
      });
      _KazImageCraft.uploadedImages[name] = newOrder;
      this._updateOrderInputs();
    }
    /**
     * Creates the wrapper around the hidden file input.
     * @private
     */
    _createWrapper() {
      let wrapper = this.fileInput.nextElementSibling;
      if (!wrapper || !wrapper.classList.contains(this.fileInput.classList[0] + "-wrapper")) {
        wrapper = document.createElement("div");
        wrapper.classList.add(this.fileInput.classList[0] + "-wrapper");
        wrapper.classList.add("kaz-image-craft-wrapper");
        wrapper.textContent = Lang.get("dragDropHint");
        this.fileInput.parentNode.insertBefore(wrapper, this.fileInput.nextSibling);
      }
      this.wrapper = wrapper;
      this.fileInput.style.display = "none";
      this._bindWrapperEvents();
    }
    /**
     * Binds click and drag events to the wrapper.
     * @private
     */
    _bindWrapperEvents() {
      this.wrapper.addEventListener("click", () => this.fileInput.click());
      this.wrapper.addEventListener("dragover", (e) => {
        e.preventDefault();
        this.wrapper.classList.add("hover");
      });
      this.wrapper.addEventListener("dragleave", () => {
        this.wrapper.classList.remove("hover");
      });
      this.wrapper.addEventListener("drop", (e) => {
        e.preventDefault();
        this.wrapper.classList.remove("hover");
        const files = e.dataTransfer.files;
        this._handleFiles(files);
      });
    }
    /**
     * Creates modal dialog for image preview/editing.
     * @private
     */
    _createPreviewModal() {
      if (document.getElementById("kaz-image-preview-modal")) return;
      const modal = document.createElement("div");
      modal.id = "kaz-image-preview-modal";
      modal.className = "kaz-image-craft-modal";
      modal.style.display = "none";
      modal.innerHTML = `
   
    <div class="kaz-image-craft-modal-backdrop"></div>
    <div class="kaz-image-craft-modal-content">
      <span class="kaz-image-craft-modal-close">&times;</span>
      
      
      <div class="kaz-image-craft-modal-main">
              
              <div class="kaz-image-craft-modal-toolbar">
      

        <div class="kaz-image-craft-tool-item kaz-image-craft-tool-grid" title="${Lang.get("rotateAndFlip")}">
          <div class="kaz-image-craft-tool-icon-grid">
            <div class="kaz-image-craft-tool-icon-cell kaz-tool-item" data-tool="crop">✂️</div>
            <div class="kaz-image-craft-tool-icon-cell kaz-tool-item" data-tool="rotate">⟳</div>
            <div class="kaz-image-craft-tool-icon-cell kaz-tool-item" data-tool="flip-h">⇋</div>
            <div class="kaz-image-craft-tool-icon-cell kaz-tool-item" data-tool="flip-v">↕</div>
            <div class="kaz-image-craft-tool-icon-cell kaz-tool-item" data-tool="compress" title="${Lang.get("compressImage")}">🗜️</div>
            <div class="kaz-image-craft-tool-icon-cell kaz-tool-item" data-tool="reset" title="${Lang.get("reset")}">🔄</div>
            <div class="kaz-image-craft-tool-icon-cell kaz-tool-item" data-tool="download" title="${Lang.get("download")}">⬇️</div>
          </div>
        </div>
      </div>

        
        <div class="kaz-image-craft-modal-image-area">
          <img src="" id="kaz-preview-image" alt="${Lang.get("previewImage")}" data-uuid="" data-name>
        </div>
      </div>
      
      <div class="kaz-image-craft-modal-image-list">
        <div class="kaz-image-list-container">
          
        </div>
      </div>


    </div>
  `;
      document.body.appendChild(modal);
      modal.querySelector(".kaz-image-craft-modal-close").onclick = modal.querySelector(".kaz-image-craft-modal-backdrop").onclick = () => {
        modal.style.display = "none";
      };
      modal.querySelectorAll(".kaz-tool-item").forEach((tool) => {
        tool.onclick = () => {
          const toolType = tool.dataset.tool;
          if (toolType === "crop") {
            this.toolsName = "crop";
            this._enableCrop();
          }
          if (toolType === "rotate") {
            this.toolsName = "rotate";
            this._enableRotate();
          }
          if (toolType === "reset") {
            this.toolsName = "reset";
            this._resetImage();
          }
          if (toolType === "flip-h") {
            this.toolsName = "flip-h";
            this._flipImage("horizontal");
          }
          if (toolType === "flip-v") {
            this.toolsName = "flip-v";
            this._flipImage("vertical");
          }
          if (toolType === "compress") {
            this.toolsName = "compress";
            this._enableCompress();
          }
          if (toolType === "download") {
            this.toolsName = "download";
            this._downloadPreviewImage();
          }
        };
      });
      modal.querySelectorAll(".kaz-image-item").forEach((item) => {
        item.onclick = () => {
          modal.querySelectorAll(".kaz-image-item").forEach((i) => i.classList.remove("active"));
          item.classList.add("active");
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
      this._createPreviewModal();
      const modal = document.getElementById("kaz-image-preview-modal");
      const img = document.getElementById("kaz-preview-image");
      img.src = document.getElementById(`img-preview-${name}-${imgId}`).src;
      img.dataset.uuid = imgId;
      img.dataset.name = name;
      modal.style.display = "flex";
    }
    _discardEdits() {
      const previewImg = document.getElementById("kaz-preview-image");
      if (!previewImg) return;
      if (this.cropBox) {
        this.cropBox.remove();
        this.cropBox = null;
      }
      if (this.rotateBox) {
        const cancelBtn = this.rotateBox.querySelector(".kaz-rotate-cancel");
        if (cancelBtn) cancelBtn.click();
      }
      this.toolsName = "";
      this.isEditing = false;
    }
    /**
     * Populates modal image list.
     * @param {Array} images
     * @param {string} name
     * @private
     */
    _addImageToKazListContainer(images, name) {
      if (!images) return;
      const container = document.querySelector(".kaz-image-list-container");
      container.innerHTML = "";
      images.forEach((img) => {
        const previewItem = Utils.createElement("div", {
          className: "kaz-image-craft-image-preview-item",
          attributes: { "data-id": img.id },
          innerHTML: `<img id="img-${name}-${img.id}" src="${img.editedUrl}" alt="${img.file.name}" class="kaz-image-craft-image">`
        });
        container.appendChild(previewItem);
        previewItem.addEventListener("click", () => {
          const kazPreviewImage = document.getElementById("kaz-preview-image");
          const editingActive = this.cropBox || this.rotateBox;
          if (editingActive) {
            const discard = confirm(Lang.get("discardEdits"));
            if (!discard) return;
            this._discardEdits();
          }
          container.querySelectorAll(".kaz-image-craft-image-preview-item").forEach((item) => item.classList.remove("active"));
          previewItem.classList.add("active");
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
    /**
     * Enable cropping mode (desktop + mobile compatible)
     */
    _enableCrop() {
      const area = document.querySelector(".kaz-image-craft-modal-image-area");
      if (!area) return;
      if (this.cropBox) return;
      const isTouch = "ontouchstart" in window;
      const startEvent = isTouch ? "touchstart" : "mousedown";
      const moveEvent = isTouch ? "touchmove" : "mousemove";
      const endEvent = isTouch ? "touchend" : "mouseup";
      const box = document.createElement("div");
      box.className = "kaz-image-craft-modal-crop-box";
      box.style.top = "50px";
      box.style.left = "50px";
      box.style.width = "200px";
      box.style.height = "200px";
      box.innerHTML = `
    <span class="kaz-crop-confirm">✔️</span>
    <span class="kaz-crop-cancel">✖️</span>
    
      <div class="crop-size-display">200px × 200px</div>

  `;
      area.style.position = "relative";
      area.appendChild(box);
      this.cropBox = box;
      const confirmBtn = box.querySelector(".kaz-crop-confirm");
      const cancelBtn = box.querySelector(".kaz-crop-cancel");
      const applyCropHandler = (e) => {
        e.preventDefault();
        this._applyCrop();
        box.remove();
      };
      const cancelCropHandler = (e) => {
        e.preventDefault();
        box.remove();
      };
      confirmBtn.onclick = applyCropHandler;
      cancelBtn.onclick = cancelCropHandler;
      confirmBtn.addEventListener("touchend", applyCropHandler);
      cancelBtn.addEventListener("touchend", cancelCropHandler);
      ["nw", "ne", "sw", "se"].forEach((dir) => {
        const handle = document.createElement("div");
        handle.className = `crop-handle crop-handle-${dir}`;
        box.appendChild(handle);
      });
      this.cropBox.querySelectorAll(".crop-handle").forEach((handle) => {
        handle.addEventListener(startEvent, (e) => {
          e.preventDefault();
          const startPoint = e.touches ? e.touches[0] : e;
          const startX = startPoint.clientX;
          const startY = startPoint.clientY;
          const rect = this.cropBox.getBoundingClientRect();
          const dir = handle.className.match(/crop-handle-([a-z]+)/)[1];
          const onMove = (e2) => {
            const point = e2.touches ? e2.touches[0] : e2;
            const dx = point.clientX - startX;
            const dy = point.clientY - startY;
            let newWidth = rect.width;
            let newHeight = rect.height;
            let newTop = rect.top;
            let newLeft = rect.left;
            if (dir.includes("e")) newWidth = rect.width + dx;
            if (dir.includes("s")) newHeight = rect.height + dy;
            if (dir.includes("w")) {
              newWidth = rect.width - dx;
              newLeft = rect.left + dx;
            }
            if (dir.includes("n")) {
              newHeight = rect.height - dy;
              newTop = rect.top + dy;
            }
            const parentRect = this.cropBox.parentElement.getBoundingClientRect();
            this.cropBox.style.width = newWidth + "px";
            this.cropBox.style.height = newHeight + "px";
            this.cropBox.style.left = newLeft - parentRect.left + "px";
            this.cropBox.style.top = newTop - parentRect.top + "px";
            const display = this.cropBox.querySelector(".crop-size-display");
            display.textContent = `${Math.round(newWidth)}px × ${Math.round(newHeight)}px`;
          };
          const onEnd = () => {
            window.removeEventListener(moveEvent, onMove);
            window.removeEventListener(endEvent, onEnd);
          };
          window.addEventListener(moveEvent, onMove);
          window.addEventListener(endEvent, onEnd);
        });
      });
      this._makeCropBoxDraggable(box, { startEvent, moveEvent, endEvent });
    }
    /**
     * Applies cropping to selected image.
     * @private
     */
    _applyCrop() {
      if (!this.cropBox) return;
      const image = document.getElementById("kaz-preview-image");
      const imageRect = image.getBoundingClientRect();
      const cropRect = this.cropBox.getBoundingClientRect();
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const sx = (cropRect.left - imageRect.left) * scaleX;
      const sy = (cropRect.top - imageRect.top) * scaleY;
      const sw = cropRect.width * scaleX;
      const sh = cropRect.height * scaleY;
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
      const id = image.dataset.uuid;
      image.src = canvas.toDataURL();
      this.cropBox.remove();
      this.cropBox = null;
      const name = image.dataset.name;
      canvas.toBlob((blob) => {
        const croppedFile = new File([blob], `${id}.${this.ext || "webp"}`, { type: this.format || "image/webp" });
        this.updateEditedImage(id, name, canvas.toDataURL(), croppedFile);
      }, this.format || "image/webp", 1);
    }
    /**
     * Makes crop box draggable.
     * @param {HTMLElement} box
     * @private
     */
    _makeCropBoxDraggable(box) {
      const area = box.parentElement;
      if (!area) return;
      let isDragging = false;
      let offsetX = 0;
      let offsetY = 0;
      const startDrag = (e) => {
        if (e.target.classList.contains("crop-handle")) return;
        e.preventDefault();
        isDragging = true;
        const point = e.touches ? e.touches[0] : e;
        const rect = box.getBoundingClientRect();
        offsetX = point.clientX - rect.left;
        offsetY = point.clientY - rect.top;
      };
      const doDrag = (e) => {
        if (!isDragging) return;
        const point = e.touches ? e.touches[0] : e;
        const parentRect = area.getBoundingClientRect();
        let x = point.clientX - parentRect.left - offsetX;
        let y = point.clientY - parentRect.top - offsetY;
        x = Math.max(0, Math.min(x, area.clientWidth - box.offsetWidth));
        y = Math.max(0, Math.min(y, area.clientHeight - box.offsetHeight));
        box.style.left = x + "px";
        box.style.top = y + "px";
      };
      const endDrag = () => {
        isDragging = false;
      };
      box.addEventListener("mousedown", startDrag);
      box.addEventListener("touchstart", startDrag, { passive: false });
      window.addEventListener("mousemove", doDrag);
      window.addEventListener("touchmove", doDrag, { passive: false });
      window.addEventListener("mouseup", endDrag);
      window.addEventListener("touchend", endDrag);
    }
    /**
     * Enables rotation UI.
     * @private
     */
    _enableRotate() {
      const area = document.querySelector(".kaz-image-craft-modal-image-area");
      if (!area) return;
      if (this.rotateBox) {
        this.rotateBox.remove();
        this.rotateBox = null;
      }
      const box = document.createElement("div");
      box.className = "kaz-image-craft-modal-rotate-box";
      box.innerHTML = `
      <span class="kaz-rotate-confirm" style="cursor:pointer;">✔️</span>
      <span class="kaz-rotate-cancel" style="cursor:pointer; margin-left:10px;">✖️</span>
      <div class="rotate-circle">
        <div class="rotate-center">+</div>
      </div>
    `;
      area.style.position = "relative";
      area.appendChild(box);
      this.rotateBox = box;
      const image = document.getElementById("kaz-preview-image");
      if (!image) return;
      const imageRect = image.getBoundingClientRect();
      const areaRect = area.getBoundingClientRect();
      const relativeLeft = imageRect.left - areaRect.left;
      const relativeTop = imageRect.top - areaRect.top;
      const centerX = relativeLeft + imageRect.width / 2;
      const centerY = relativeTop + imageRect.height / 2;
      const rotateCircle = box.querySelector(".rotate-circle");
      const rotateCenterMark = box.querySelector(".rotate-center");
      Object.assign(rotateCircle.style, {
        position: "absolute",
        width: "100px",
        height: "100px",
        border: "1px dashed rgba(153, 153, 153, 0.7)",
        borderRadius: "50%",
        left: `${centerX - 50}px`,
        top: `${centerY - 50}px`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        cursor: "grab",
        userSelect: "none",
        backgroundColor: "rgba(255, 255, 255, 0.6)",
        boxShadow: "0 0 5px rgba(255,255,255,0.5)"
      });
      Object.assign(rotateCenterMark.style, {
        width: "50px",
        height: "50px",
        textAlign: "center",
        lineHeight: "50px",
        fontWeight: "bold",
        color: "red",
        cursor: "move",
        userSelect: "none",
        backgroundColor: "rgba(255, 255, 255, 0.5)",
        borderRadius: "50%",
        boxShadow: "0 0 5px rgba(255,0,0,0.7)"
      });
      let rotateCenter = { x: centerX, y: centerY };
      let rotation = 0;
      let originalTransform = image.style.transform || "";
      const isTouch = "ontouchstart" in window;
      const startMove = (e) => {
        e.preventDefault();
        const startX = isTouch ? e.touches[0].clientX : e.clientX;
        const startY = isTouch ? e.touches[0].clientY : e.clientY;
        let lastX = startX;
        let lastY = startY;
        const move = (ev) => {
          const cx = isTouch ? ev.touches[0].clientX : ev.clientX;
          const cy = isTouch ? ev.touches[0].clientY : ev.clientY;
          const dx = cx - lastX;
          const dy = cy - lastY;
          rotateCenter.x += dx;
          rotateCenter.y += dy;
          rotateCircle.style.left = `${rotateCenter.x - 50}px`;
          rotateCircle.style.top = `${rotateCenter.y - 50}px`;
          lastX = cx;
          lastY = cy;
        };
        const end = () => {
          window.removeEventListener(isTouch ? "touchmove" : "mousemove", move);
          window.removeEventListener(isTouch ? "touchend" : "mouseup", end);
        };
        window.addEventListener(isTouch ? "touchmove" : "mousemove", move);
        window.addEventListener(isTouch ? "touchend" : "mouseup", end);
      };
      rotateCenterMark.addEventListener(isTouch ? "touchstart" : "mousedown", startMove);
      const startRotate = (e) => {
        if (e.target === rotateCenterMark) return;
        e.preventDefault();
        const move = (ev) => {
          const cx = isTouch ? ev.touches[0].clientX : ev.clientX;
          const cy = isTouch ? ev.touches[0].clientY : ev.clientY;
          const dx = cx - (areaRect.left + rotateCenter.x);
          const dy = cy - (areaRect.top + rotateCenter.y);
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          rotation = angle;
          const originX = rotateCenter.x - relativeLeft;
          const originY = rotateCenter.y - relativeTop;
          image.style.transformOrigin = `${originX}px ${originY}px`;
          image.style.transform = `rotate(${rotation}deg)`;
        };
        const end = () => {
          window.removeEventListener(isTouch ? "touchmove" : "mousemove", move);
          window.removeEventListener(isTouch ? "touchend" : "mouseup", end);
        };
        window.addEventListener(isTouch ? "touchmove" : "mousemove", move);
        window.addEventListener(isTouch ? "touchend" : "mouseup", end);
      };
      rotateCircle.addEventListener(isTouch ? "touchstart" : "mousedown", startRotate);
      const confirmBtn = box.querySelector(".kaz-rotate-confirm");
      const cancelBtn = box.querySelector(".kaz-rotate-cancel");
      confirmBtn.addEventListener("click", () => {
        this._applyRotationToCanvas(image, rotation, rotateCenter, relativeLeft, relativeTop);
        box.remove();
        this.rotateBox = null;
      });
      cancelBtn.addEventListener("click", () => {
        image.style.transform = originalTransform;
        box.remove();
        this.rotateBox = null;
      });
      if (isTouch) {
        confirmBtn.addEventListener("touchend", (e) => {
          e.preventDefault();
          confirmBtn.click();
        });
        cancelBtn.addEventListener("touchend", (e) => {
          e.preventDefault();
          cancelBtn.click();
        });
      }
    }
    /**
     * Applies rotation to canvas and updates image preview.
     * @private
     */
    _applyRotationToCanvas(image, rotation, rotateCenter, relativeLeft, relativeTop) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const naturalWidth = image.naturalWidth;
      const naturalHeight = image.naturalHeight;
      const imageRect = image.getBoundingClientRect();
      const scaleX = naturalWidth / imageRect.width;
      const scaleY = naturalHeight / imageRect.height;
      canvas.width = naturalWidth;
      canvas.height = naturalHeight;
      const originX = (rotateCenter.x - relativeLeft) * scaleX;
      const originY = (rotateCenter.y - relativeTop) * scaleY;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.translate(originX, originY);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.drawImage(image, -originX, -originY, naturalWidth, naturalHeight);
      const dataURL = canvas.toDataURL();
      const name = image.dataset.name;
      const id = image.dataset.uuid || image.dataset.id || "";
      canvas.toBlob((blob) => {
        const rotatedFile = new File([blob], `${id}.${this.ext || "webp"}`, { type: this.format || "image/webp" });
        this.updateEditedImage(id, name, dataURL, rotatedFile);
      }, this.format || "image/webp", 1);
      image.src = dataURL;
      image.style.transform = "";
    }
    /**
     * Enables image flip in given direction.
     * @param {'horizontal'|'vertical'} direction
     * @private
     */
    _flipImage(direction) {
      const image = document.getElementById("kaz-preview-image");
      if (!image) return;
      const id = image.dataset.uuid;
      const name = image.dataset.name;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      canvas.width = width;
      canvas.height = height;
      ctx.save();
      if (direction === "horizontal") {
        ctx.scale(-1, 1);
        ctx.drawImage(image, -width, 0);
      } else if (direction === "vertical") {
        ctx.scale(1, -1);
        ctx.drawImage(image, 0, -height);
      }
      ctx.restore();
      const dataURL = canvas.toDataURL();
      image.src = dataURL;
      canvas.toBlob((blob) => {
        const rotatedFile = new File([blob], `${id}.${this.ext || "webp"}`, { type: this.format || "image/webp" });
        this.updateEditedImage(id, name, dataURL, rotatedFile);
      }, this.format || "image/webp", 1);
    }
    _downloadPreviewImage() {
      const img = document.getElementById("kaz-preview-image");
      if (!img || !img.src) {
        alert("No image to download");
        return;
      }
      const link = document.createElement("a");
      link.href = img.src;
      const fileName = img.dataset.name || "kaz-image.png";
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    /**
     * Enables image compression interface.
     * @private
     */
    _enableCompress() {
      const image = document.getElementById("kaz-preview-image");
      if (!image) return;
      this._createCompressBox(image);
    }
    /**
     * Creates compression settings interface.
     * @param {HTMLImageElement} image - Target image element
     * @private
     */
    _createCompressBox(image) {
      this._removeCompressBox();
      const modal = document.getElementById("kaz-image-preview-modal");
      if (!modal) return;
      const compressBox = document.createElement("div");
      compressBox.className = CONSTANTS.CLASSES.COMPRESS_BOX;
      compressBox.innerHTML = this._getCompressBoxHTML(image);
      modal.querySelector(".kaz-image-craft-modal-content").appendChild(compressBox);
      this.compressBox = compressBox;
      this._bindCompressEvents(image);
    }
    /**
     * Generates HTML for compression settings box.
     * @param {HTMLImageElement} image - Target image element
     * @returns {string}
     * @private
     */
    _getCompressBoxHTML(image) {
      const currentWidth = image.naturalWidth;
      const currentHeight = image.naturalHeight;
      const currentFileSize = this._estimateFileSize(image);
      return `
      <div class="kaz-compress-header">
        <h3>${Lang.get("compressionSettings")}</h3>
        <button class="kaz-compress-close" type="button">&times;</button>
      </div>

      <div class="kaz-compress-content">
        <div class="kaz-compress-tabs">
          <button class="kaz-compress-tab active" data-tab="dimensions">${Lang.get("resizeByDimensions")}</button>
          <button class="kaz-compress-tab" data-tab="filesize">${Lang.get("resizeByFileSize")}</button>
        </div>

        <div class="kaz-compress-tab-content" id="dimensions-tab">
          <div class="kaz-compress-row">
            <label>${Lang.get("currentSize")}: ${currentWidth} × ${currentHeight} ${Lang.get("pixels")}</label>
          </div>

          <div class="kaz-compress-row">
            <div class="kaz-compress-input-group">
              <label for="compress-max-width">${Lang.get("maxWidth")}</label>
              <input type="number" id="compress-max-width" value="${currentWidth}" min="1" max="${currentWidth}">
              <span>${Lang.get("pixels")}</span>
            </div>

            <div class="kaz-compress-input-group">
              <label for="compress-max-height">${Lang.get("maxHeight")}</label>
              <input type="number" id="compress-max-height" value="${currentHeight}" min="1" max="${currentHeight}">
              <span>${Lang.get("pixels")}</span>
            </div>
          </div>

          <div class="kaz-compress-row">
            <label>
              <input type="checkbox" id="compress-maintain-ratio" checked>
              Maintain aspect ratio
            </label>
          </div>
        </div>

        <div class="kaz-compress-tab-content" id="filesize-tab" style="display: none;">
          <div class="kaz-compress-row">
            <label>${Lang.get("currentSize")}: ${Utils.formatFileSize(currentFileSize)}</label>
          </div>

          <div class="kaz-compress-row">
            <div class="kaz-compress-input-group">
              <label for="compress-max-filesize">${Lang.get("maxFileSize")}</label>
              <input type="number" id="compress-max-filesize" value="2" min="0.1" max="50" step="0.1">
              <select id="compress-filesize-unit">
                <option value="MB" selected>${Lang.get("megabytes")}</option>
                <option value="KB">${Lang.get("kilobytes")}</option>
              </select>
            </div>
          </div>
        </div>

        <div class="kaz-compress-row">
          <div class="kaz-compress-input-group">
            <label for="compress-quality">${Lang.get("quality")}</label>
            <input type="range" id="compress-quality" min="0.1" max="1" step="0.1" value="0.8">
            <span id="compress-quality-value">80%</span>
          </div>
        </div>

        <div class="kaz-compress-preview">
          <div id="compress-preview-info"></div>
        </div>
      </div>

      <div class="kaz-compress-footer">
        <button class="kaz-compress-btn kaz-compress-cancel">${Lang.get("cancel")}</button>
        <button class="kaz-compress-btn kaz-compress-apply">${Lang.get("apply")}</button>
      </div>
    `;
    }
    /**
     * Binds events for compression interface.
     * @param {HTMLImageElement} image - Target image element
     * @private
     */
    _bindCompressEvents(image) {
      const compressBox = this.compressBox;
      if (!compressBox) return;
      compressBox.querySelectorAll(".kaz-compress-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
          compressBox.querySelectorAll(".kaz-compress-tab").forEach((t) => t.classList.remove("active"));
          compressBox.querySelectorAll(".kaz-compress-tab-content").forEach((c) => c.style.display = "none");
          tab.classList.add("active");
          const tabId = tab.dataset.tab + "-tab";
          compressBox.querySelector(`#${tabId}`).style.display = "block";
        });
      });
      const qualitySlider = compressBox.querySelector("#compress-quality");
      const qualityValue = compressBox.querySelector("#compress-quality-value");
      qualitySlider.addEventListener("input", () => {
        qualityValue.textContent = Math.round(qualitySlider.value * 100) + "%";
        this._updateCompressPreview(image);
      });
      const widthInput = compressBox.querySelector("#compress-max-width");
      const heightInput = compressBox.querySelector("#compress-max-height");
      const maintainRatio = compressBox.querySelector("#compress-maintain-ratio");
      const updateDimensions = (changedInput) => {
        if (maintainRatio.checked) {
          const aspectRatio = image.naturalWidth / image.naturalHeight;
          if (changedInput === widthInput) {
            heightInput.value = Math.round(widthInput.value / aspectRatio);
          } else {
            widthInput.value = Math.round(heightInput.value * aspectRatio);
          }
        }
        this._updateCompressPreview(image);
      };
      widthInput.addEventListener("input", () => updateDimensions(widthInput));
      heightInput.addEventListener("input", () => updateDimensions(heightInput));
      maintainRatio.addEventListener("change", () => this._updateCompressPreview(image));
      compressBox.querySelector("#compress-max-filesize").addEventListener("input", () => {
        this._updateCompressPreview(image);
      });
      compressBox.querySelector(".kaz-compress-close").addEventListener("click", () => {
        this._removeCompressBox();
      });
      compressBox.querySelector(".kaz-compress-cancel").addEventListener("click", () => {
        this._removeCompressBox();
      });
      compressBox.querySelector(".kaz-compress-apply").addEventListener("click", () => {
        this._applyCompress(image);
      });
      this._updateCompressPreview(image);
    }
    /**
     * Removes compression settings box.
     * @private
     */
    _removeCompressBox() {
      if (this.compressBox) {
        this.compressBox.remove();
        this.compressBox = null;
      }
    }
    /**
     * Updates compression preview information.
     * @param {HTMLImageElement} image - Target image element
     * @private
     */
    _updateCompressPreview(image) {
      const compressBox = this.compressBox;
      if (!compressBox) return;
      const previewInfo = compressBox.querySelector("#compress-preview-info");
      const activeTab = compressBox.querySelector(".kaz-compress-tab.active").dataset.tab;
      const quality = parseFloat(compressBox.querySelector("#compress-quality").value);
      let targetWidth, targetHeight, targetFileSize;
      if (activeTab === "dimensions") {
        targetWidth = parseInt(compressBox.querySelector("#compress-max-width").value) || image.naturalWidth;
        targetHeight = parseInt(compressBox.querySelector("#compress-max-height").value) || image.naturalHeight;
        const { width, height } = Utils.calculateOptimalDimensions(
          image.naturalWidth,
          image.naturalHeight,
          targetWidth,
          targetHeight
        );
        targetWidth = width;
        targetHeight = height;
        targetFileSize = this._estimateCompressedFileSize(image, targetWidth, targetHeight, quality);
      } else {
        const maxFileSize = parseFloat(compressBox.querySelector("#compress-max-filesize").value) || 2;
        const unit = compressBox.querySelector("#compress-filesize-unit").value;
        targetFileSize = Utils.parseSizeToBytes(maxFileSize + unit);
        const result = this._calculateDimensionsForFileSize(image, targetFileSize, quality);
        targetWidth = result.width;
        targetHeight = result.height;
      }
      const currentFileSize = this._estimateFileSize(image);
      const reduction = Math.round((1 - targetFileSize / currentFileSize) * 100);
      previewInfo.innerHTML = `
      <div class="kaz-compress-preview-item">
        <strong>${Lang.get("targetSize")}:</strong> ${targetWidth} × ${targetHeight} ${Lang.get("pixels")}
      </div>
      <div class="kaz-compress-preview-item">
        <strong>${Lang.get("targetSize")}:</strong> ${Utils.formatFileSize(targetFileSize)}
      </div>
      <div class="kaz-compress-preview-item">
        <strong>Reduction:</strong> ${reduction > 0 ? reduction + "%" : "No reduction"}
      </div>
    `;
    }
    /**
     * Applies compression to the image.
     * @param {HTMLImageElement} image - Target image element
     * @private
     */
    async _applyCompress(image) {
      const compressBox = this.compressBox;
      if (!compressBox) return;
      const applyBtn = compressBox.querySelector(".kaz-compress-apply");
      const originalText = applyBtn.textContent;
      applyBtn.textContent = Lang.get("compressing");
      applyBtn.disabled = true;
      try {
        const activeTab = compressBox.querySelector(".kaz-compress-tab.active").dataset.tab;
        const quality = parseFloat(compressBox.querySelector("#compress-quality").value);
        let targetWidth, targetHeight, targetFileSize;
        if (activeTab === "dimensions") {
          targetWidth = parseInt(compressBox.querySelector("#compress-max-width").value) || image.naturalWidth;
          targetHeight = parseInt(compressBox.querySelector("#compress-max-height").value) || image.naturalHeight;
          const { width, height } = Utils.calculateOptimalDimensions(
            image.naturalWidth,
            image.naturalHeight,
            targetWidth,
            targetHeight
          );
          targetWidth = width;
          targetHeight = height;
        } else {
          const maxFileSize = parseFloat(compressBox.querySelector("#compress-max-filesize").value) || 2;
          const unit = compressBox.querySelector("#compress-filesize-unit").value;
          targetFileSize = Utils.parseSizeToBytes(maxFileSize + unit);
          const result = this._calculateDimensionsForFileSize(image, targetFileSize, quality);
          targetWidth = result.width;
          targetHeight = result.height;
        }
        const compressedResult = await this._compressImage(image, targetWidth, targetHeight, quality, targetFileSize);
        if (compressedResult) {
          image.src = compressedResult.dataURL;
          const id = image.dataset.uuid;
          const name = image.dataset.name;
          this.updateEditedImage(id, name, compressedResult.dataURL, compressedResult.file);
          console.log(Lang.get("compressionComplete"));
        }
        this._removeCompressBox();
      } catch (error) {
        console.error("Compression failed:", error);
        alert(Lang.get("compressionFailed"));
      } finally {
        applyBtn.textContent = originalText;
        applyBtn.disabled = false;
      }
    }
    /**
     * Resets edited image to original preview.
     * @private
     */
    _resetImage(confirmReset = true) {
      var _a;
      const previewImg = document.getElementById("kaz-preview-image");
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
      if (confirmReset && !confirm(Lang.get("resetWarning"))) return;
      const imgObj = (_a = _KazImageCraft.uploadedImages[name]) == null ? void 0 : _a.find((img) => img.id === uuid);
      if (imgObj) {
        imgObj.editedUrl = null;
        imgObj.file = imgObj.originalFile;
      }
      previewImg.src = originalSrc;
      const mainImg = document.getElementById(imgId);
      if (mainImg) mainImg.src = originalSrc;
      originalImg.src = originalSrc;
    }
    /**
     * Syncs the cropped DataURL and File back to the upload list, and refreshes the preview image.
     *
     * @param {string} id        The image UUID
     * @param {string} name      The <input name="…"> key, i.e. the key of uploadedImages
     * @param {string} dataURL   The cropped base64 DataURL
     * @param {File}   newFile   The cropped File object
     */
    updateEditedImage(id, name, dataURL, newFile, useBlob = true) {
      const list = _KazImageCraft.uploadedImages[name];
      if (!list) return;
      const imgObj = list.find((i) => i.id === id);
      if (!imgObj) {
        console.warn(`Image with id=${id} not found in uploadedImages[${name}]`);
        return;
      }
      let finalUrl = dataURL;
      if (useBlob && dataURL.startsWith("data:")) {
        const arr = dataURL.split(",");
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        const blob = new Blob([u8arr], { type: mime });
        finalUrl = URL.createObjectURL(blob);
      }
      imgObj.editedUrl = finalUrl;
      if (newFile) imgObj.file = newFile;
      const img1 = document.getElementById(`img-${name}-${id}`);
      if (img1) img1.src = finalUrl;
      const img2 = document.getElementById(`img-preview-${name}-${id}`);
      if (img2) img2.src = finalUrl;
      this._syncHtmlImagesByPreview(name);
    }
    /**
     * Generate UUID (delegated to Utils)
     * @returns {string}
     * @deprecated Use Utils.generateUUID() instead
     */
    generateUUID() {
      return Utils.generateUUID();
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
      if (!_KazImageCraft.uploadedImages[name]) {
        _KazImageCraft.uploadedImages[name] = [];
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
          let extMatch = url.match(/\.(\w+)(?:\?|#|$)/);
          let ext = extMatch ? extMatch[1].toLowerCase() : "png";
          const fileName = `existing_${i + 1}.${ext}`;
          const file = new File([blob], fileName, { type: blob.type });
          const id = Utils.generateUUID();
          _KazImageCraft.uploadedImages[name].push({
            id,
            file,
            previewUrl: url,
            originalFile: file,
            editedUrl: url
          });
        } catch (error) {
          console.warn(`Error loading image from ${url}:`, error);
        }
      }
      this._renderPreview(name);
    }
    /**
     * Estimates current file size of an image element.
     * @param {HTMLImageElement} image - Image element
     * @returns {number} Estimated file size in bytes
     * @private
     */
    _estimateFileSize(image) {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      const pixels = width * height;
      const bytesPerPixel = 1.2;
      return Math.round(pixels * bytesPerPixel);
    }
    /**
     * Estimates compressed file size.
     * @param {HTMLImageElement} image - Source image
     * @param {number} targetWidth - Target width
     * @param {number} targetHeight - Target height
     * @param {number} quality - Compression quality (0-1)
     * @returns {number} Estimated file size in bytes
     * @private
     */
    _estimateCompressedFileSize(image, targetWidth, targetHeight, quality) {
      const pixels = targetWidth * targetHeight;
      const qualityFactor = Math.max(0.1, quality);
      const bytesPerPixel = 1.2 * qualityFactor;
      return Math.round(pixels * bytesPerPixel);
    }
    /**
     * Calculates optimal dimensions to achieve target file size.
     * @param {HTMLImageElement} image - Source image
     * @param {number} targetFileSize - Target file size in bytes
     * @param {number} quality - Compression quality (0-1)
     * @returns {Object} {width, height}
     * @private
     */
    _calculateDimensionsForFileSize(image, targetFileSize, quality) {
      const originalWidth = image.naturalWidth;
      const originalHeight = image.naturalHeight;
      const aspectRatio = originalWidth / originalHeight;
      const qualityFactor = Math.max(0.1, quality);
      const bytesPerPixel = 1.2 * qualityFactor;
      const targetPixels = targetFileSize / bytesPerPixel;
      const targetWidth = Math.sqrt(targetPixels * aspectRatio);
      const targetHeight = targetPixels / targetWidth;
      return {
        width: Math.min(Math.round(targetWidth), originalWidth),
        height: Math.min(Math.round(targetHeight), originalHeight)
      };
    }
    /**
     * Compresses an image to specified dimensions and quality.
     * @param {HTMLImageElement} image - Source image
     * @param {number} targetWidth - Target width
     * @param {number} targetHeight - Target height
     * @param {number} quality - Compression quality (0-1)
     * @param {number} [maxFileSize] - Maximum file size in bytes
     * @returns {Promise<Object>} {dataURL, file, finalQuality}
     * @private
     */
    async _compressImage(image, targetWidth, targetHeight, quality, maxFileSize = null) {
      return new Promise((resolve, reject) => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
          let currentQuality = quality;
          const format = this.format || CONSTANTS.DEFAULT_OUTPUT_FORMAT;
          const tryCompress = () => {
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error("Failed to create blob"));
                return;
              }
              if (maxFileSize && blob.size > maxFileSize && currentQuality > CONSTANTS.COMPRESSION.MIN_QUALITY) {
                currentQuality = Math.max(
                  CONSTANTS.COMPRESSION.MIN_QUALITY,
                  currentQuality - CONSTANTS.COMPRESSION.QUALITY_STEP
                );
                tryCompress();
                return;
              }
              const id = image.dataset.uuid || Utils.generateUUID();
              const fileName = `${id}.${this.ext || "webp"}`;
              const file = new File([blob], fileName, { type: format });
              resolve({
                dataURL: canvas.toDataURL(format, currentQuality),
                file,
                finalQuality: currentQuality,
                finalSize: blob.size
              });
            }, format, currentQuality);
          };
          tryCompress();
        } catch (error) {
          reject(error);
        }
      });
    }
    /**
     * Compresses image by file size with iterative quality reduction.
     * @param {HTMLImageElement} image - Source image
     * @param {number} maxFileSize - Maximum file size in bytes
     * @param {number} initialQuality - Initial quality (0-1)
     * @returns {Promise<Object>} Compression result
     * @private
     */
    async _compressToFileSize(image, maxFileSize, initialQuality = 0.8) {
      let currentWidth = image.naturalWidth;
      let currentHeight = image.naturalHeight;
      let currentQuality = initialQuality;
      const maxAttempts = 10;
      let attempts = 0;
      while (attempts < maxAttempts) {
        const result = await this._compressImage(image, currentWidth, currentHeight, currentQuality);
        if (result.finalSize <= maxFileSize) {
          return result;
        }
        if (currentQuality <= CONSTANTS.COMPRESSION.MIN_QUALITY) {
          currentWidth = Math.round(currentWidth * CONSTANTS.COMPRESSION.RESIZE_STEP);
          currentHeight = Math.round(currentHeight * CONSTANTS.COMPRESSION.RESIZE_STEP);
          currentQuality = initialQuality;
        } else {
          currentQuality = Math.max(
            CONSTANTS.COMPRESSION.MIN_QUALITY,
            currentQuality - CONSTANTS.COMPRESSION.QUALITY_STEP
          );
        }
        attempts++;
      }
      return this._compressImage(image, currentWidth, currentHeight, currentQuality);
    }
  };
  /**
   * Global storage for all uploaded images grouped by input name.
   * @type {Object.<string, Array<{id: string, file: File, previewUrl: string, editedUrl: string}>>}
   */
  __publicField(_KazImageCraft, "uploadedImages", {});
  __publicField(_KazImageCraft, "instances", []);
  __publicField(_KazImageCraft, "globalConfig", {});
  let KazImageCraft = _KazImageCraft;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { KazImageCraft, Utils, Lang, CONSTANTS };
  }
  window.KazImageCraft = KazImageCraft;
  window.KazImageCraftUtils = Utils;
  window.KazImageCraftLang = Lang;
  window.KazImageCraftConstants = CONSTANTS;
});
