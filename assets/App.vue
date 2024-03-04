<template>
  <div class="main" @dragenter.prevent @dragover.prevent @drop.prevent="onDrop">
    <progress
      v-if="uploadProgress !== null"
      :value="uploadProgress"
      max="100"
    ></progress>
    <UploadPopup
      v-model="showUploadPopup"
      @upload="onUploadClicked"
      @createFolder="createFolder"
    ></UploadPopup>
    <button class="upload-button circle" @click="showUploadPopup = true">
      <img
        style="filter: invert(100%)"
        src="https://cdnjs.cloudflare.com/ajax/libs/material-design-icons/4.0.0/png/file/upload_file/materialicons/36dp/2x/baseline_upload_file_black_36dp.png"
        alt="Upload"
        width="36"
        height="36"
        @contextmenu.prevent
      />
    </button>
    <div class="app-bar">
      <input type="search" v-model="search" aria-label="Search" />
      <div class="menu-button">
        <button class="circle" @click="showMenu = true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 448 512"
            width="24"
            height="24"
            title="Menu"
            style="display: block; margin: 4px"
          >
            <!--! Font Awesome Pro 6.2.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. -->
            <path
              d="M120 256c0 30.9-25.1 56-56 56s-56-25.1-56-56s25.1-56 56-56s56 25.1 56 56zm160 0c0 30.9-25.1 56-56 56s-56-25.1-56-56s25.1-56 56-56s56 25.1 56 56zm104 56c-30.9 0-56-25.1-56-56s25.1-56 56-56s56 25.1 56 56s-25.1 56-56 56z"
            />
          </svg>
        </button>
        <Menu
          v-model="showMenu"
          :items="[{ text: 'Name' }, { text: 'Size' }, { text: 'Date' }, { text: 'Paste' }]"
          @click="onMenuClick"
        />
      </div>
    </div>
    <ul class="file-list">
      <li v-if="cwd !== ''">
        <div
          tabindex="0"
          class="file-item"
          @click="cwd = cwd.replace(/[^\/]+\/$/, '')"
          @contextmenu.prevent
        >
          <div class="file-icon">
            <img
              src="https://cdnjs.cloudflare.com/ajax/libs/material-design-icons/4.0.0/png/file/folder/materialicons/36dp/2x/baseline_folder_black_36dp.png"
              width="36"
              height="36"
              alt="Folder"
            />
          </div>
          <span class="file-name">..</span>
        </div>
      </li>
      <li v-for="folder in filteredFolders" :key="folder">
        <div
          tabindex="0"
          class="file-item"
          @click="cwd = folder"
          @contextmenu.prevent="
            showContextMenu = true;
            focusedItem = folder;
          "
        >
          <div class="file-icon">
            <img
              src="https://cdnjs.cloudflare.com/ajax/libs/material-design-icons/4.0.0/png/file/folder/materialicons/36dp/2x/baseline_folder_black_36dp.png"
              width="36"
              height="36"
              alt="Folder"
            />
          </div>
          <span
            class="file-name"
            v-text="folder.match(/.*?([^/]*)\/?$/)[1]"
          ></span>
        </div>
      </li>
      <li v-for="file in currentShownFiles" :key="file.key">
        <a
          :href="`${rawBaseURL}/${file.key}`"
          target="_blank"
          @contextmenu.prevent="
            showContextMenu = true;
            focusedItem = file;
          "
        >
          <div class="file-item">
            <MimeIcon
              :content-type="file.httpMetadata.contentType"
              :thumbnail="
                file.customMetadata.thumbnail
                  ? `${rawBaseURL}/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png`
                  : null
              "
            />
            <div>
              <div class="file-name" v-text="file.key.split('/').pop()"></div>
              <div class="file-attr">
                <span v-text="new Date(file.uploaded).toLocaleString()"></span>
                <span v-text="formatSize(file.size)"></span>
              </div>
            </div>
          </div>
        </a>
      </li>
    </ul>
    <div v-if="loading" style="margin-top: 12px; text-align: center">
      <span>Loading...</span>
    </div>
    <div
      v-else-if="!filteredFiles.length && !filteredFolders.length"
      style="margin-top: 12px; text-align: center"
    >
      <span>No files</span>
    </div>
    <Dialog v-model="showContextMenu">
      <div
        v-text="focusedItem.key || focusedItem"
        class="contextmenu-filename"
        @click.stop.prevent
      ></div>
      <ul v-if="typeof focusedItem === 'string'" class="contextmenu-list">
        <li>
          <button @click="copyLink(`/?p=${encodeURIComponent(focusedItem)}`)">
            <span>Copy Link</span>
          </button>
        </li>
        <li>
          <button
            style="color: red"
            @click="removeFile(focusedItem + '_$folder$')"
          >
            <span>Remove</span>
          </button>
        </li>
      </ul>
      <ul v-else class="contextmenu-list">
        <li>
          <button @click="renameFile(focusedItem.key)">
            <span>Rename</span>
          </button>
        </li>
        <li>
          <button @click="clipboard = focusedItem.key">
            <span>Copy</span>
          </button>
        </li>
        <li>
          <a :href="`${rawBaseURL}/${focusedItem.key}`" target="_blank" download>
            <span>Download</span>
          </a>
        </li>
        <li>
          <button @click="copyLink(`${rawBaseURL}/${focusedItem.key}`)">
            <span>Copy Link</span>
          </button>
        </li>
        <li>
          <button style="color: red" @click="removeFile(focusedItem.key)">
            <span>Remove</span>
          </button>
        </li>
      </ul>
    </Dialog>
  </div>
</template>

<script>
import {
  generateThumbnail,
  blobDigest,
  multipartUpload,
  SIZE_LIMIT,
} from "/assets/main.mjs";
import Dialog from "./Dialog.vue";
import Menu from "./Menu.vue";
import MimeIcon from "./MimeIcon.vue";
import UploadPopup from "./UploadPopup.vue";

export default {
  data: () => ({
    clipboard: null,
    cwd: new URL(window.location).searchParams.get("p") || "",
    files: [],
    folders: [],
    focusedItem: null,
    loading: false,
    orderBy: null,
    orderIn: "asc",
    search: "",
    showContextMenu: false,
    showMenu: false,
    showUploadPopup: false,
    uploadProgress: null,
    uploadQueue: [],
    rawBaseURL: 'https://r2.epb.wiki',
  }),

  computed: {
    filteredFiles() {
      let files = this.files;
      if (this.search) {
        files = files.filter((file) =>
          file.key.split("/").pop().includes(this.search)
        );
      }
      return files;
    },

    filteredFolders() {
      let folders = this.folders;
      if (this.search) {
        folders = folders.filter((folder) => folder.includes(this.search));
      }
      return folders;
    },

    currentShownFiles() {
      let files = this.filteredFiles;
      this.orderBy ??= "name";
      files.sort((a, b) => {
        switch (this.orderBy) {
          case "name":
            return this.orderIn === "asc"
              ? a.key.localeCompare(b.key)
              : b.key.localeCompare(a.key);
          case "size":
            return this.orderIn === "asc"
              ? a.size - b.size
              : b.size - a.size;
          case "date":
            return this.orderIn === "asc"
              ? new Date(a.uploaded) - new Date(b.uploaded)
              : new Date(b.uploaded) - new Date(a.uploaded);
        }
      });
      return files;
    }
  },

  methods: {
    copyLink(link) {
      const url = new URL(link, window.location.origin);
      navigator.clipboard.writeText(url.toString());
    },

    async copyPaste(source, target) {
      const uploadUrl = `/api/write/items/${target}`;
      await axios.put(uploadUrl, "", {
        headers: { "x-amz-copy-source": encodeURIComponent(source) },
      });
    },

    async createFolder() {
      try {
        const folderName = window.prompt("Folder name");
        if (!folderName) return;
        this.showUploadPopup = false;
        const uploadUrl = `/api/write/items/${this.cwd}${folderName}/_$folder$`;
        await axios.put(uploadUrl, "");
        this.fetchFiles();
      } catch (error) {
        fetch("/api/write/")
          .then((value) => {
            if (value.redirected) window.location.href = value.url;
          })
          .catch(() => {});
        console.log(`Create folder failed`);
      }
    },

    fetchFiles() {
      this.files = [];
      this.folders = [];
      this.loading = true;
      fetch(`/api/children/${this.cwd}`)
        .then((res) => res.json())
        .then((files) => {
          this.files = files.value;
          this.folders = files.folders;
          this.loading = false;
        });
    },

    formatSize(size) {
      const units = ["B", "KB", "MB", "GB", "TB"];
      let i = 0;
      while (size >= 1024) {
        size /= 1024;
        i++;
      }
      return `${size.toFixed(1)} ${units[i]}`;
    },

    onDrop(ev) {
      let files;
      if (ev.dataTransfer.items) {
        files = [...ev.dataTransfer.items]
          .filter((item) => item.kind === "file")
          .map((item) => item.getAsFile());
      } else files = ev.dataTransfer.files;
      this.uploadFiles(files);
    },

    onMenuClick(text) {
      const originalOrder = this.orderBy;
      switch (text) {
        case "Name":
          this.orderBy = "name";
          break;
        case "Size":
          this.orderBy = "size";
          break;
        case "Date":
          this.orderBy = "date";
          break;
        case "Paste":
          return this.pasteFile();
      }
      if (originalOrder === this.orderBy) {
        this.orderIn = this.orderIn === "asc" ? "desc" : "asc";
      } else {
        this.orderIn = "asc";
      }
    },

    onUploadClicked(fileElement) {
      if (!fileElement.value) return;
      this.uploadFiles(fileElement.files);
      this.showUploadPopup = false;
      fileElement.value = null;
    },

    async pasteFile() {
      if (!this.clipboard) return;
      let newName = window.prompt("Rename to:");
      if (newName === null) return;
      if (newName === "") newName = this.clipboard.split("/").pop();
      await this.copyPaste(this.clipboard, `${this.cwd}${newName}`);
      this.fetchFiles();
    },

    async processUploadQueue() {
      if (!this.uploadQueue.length) {
        this.fetchFiles();
        this.uploadProgress = null;
        return;
      }

      /** @type File **/
      const { basedir, file } = this.uploadQueue.pop(0);
      let thumbnailDigest = null;

      if (file.type.startsWith("image/") || file.type === "video/mp4") {
        try {
          const thumbnailBlob = await generateThumbnail(file);
          const digestHex = await blobDigest(thumbnailBlob);

          const thumbnailUploadUrl = `/api/write/items/_$flaredrive$/thumbnails/${digestHex}.png`;
          try {
            await axios.put(thumbnailUploadUrl, thumbnailBlob);
            thumbnailDigest = digestHex;
          } catch (error) {
            fetch("/api/write/")
              .then((value) => {
                if (value.redirected) window.location.href = value.url;
              })
              .catch(() => {});
            console.log(`Upload ${digestHex}.png failed`);
          }
        } catch (error) {
          console.log(`Generate thumbnail failed`);
        }
      }

      try {
        const uploadUrl = `/api/write/items/${basedir}${file.name}`;
        const headers = {};
        const onUploadProgress = (progressEvent) => {
          var percentCompleted =
            (progressEvent.loaded * 100) / progressEvent.total;
          this.uploadProgress = percentCompleted;
        };
        if (thumbnailDigest) headers["fd-thumbnail"] = thumbnailDigest;
        if (file.size >= SIZE_LIMIT) {
          await multipartUpload(`${basedir}${file.name}`, file, {
            headers,
            onUploadProgress,
          });
        } else {
          await axios.put(uploadUrl, file, { headers, onUploadProgress });
        }
      } catch (error) {
        fetch("/api/write/")
          .then((value) => {
            if (value.redirected) window.location.href = value.url;
          })
          .catch(() => {});
        console.log(`Upload ${file.name} failed`, error);
      }
      setTimeout(this.processUploadQueue);
    },

    async removeFile(key) {
      if (!window.confirm(`Delete ${key} permanently?`)) return;
      await axios.delete(`/api/write/items/${key}`);
      this.fetchFiles();
    },

    async renameFile(key) {
      const newName = window.prompt("Rename to:");
      if (!newName) return;
      await this.copyPaste(key, `${this.cwd}${newName}`);
      await axios.delete(`/api/write/items/${key}`);
      this.fetchFiles();
    },

    uploadFiles(files) {
      if (this.cwd && !this.cwd.endsWith("/")) this.cwd += "/";

      const uploadTasks = Array.from(files).map((file) => ({
        basedir: this.cwd,
        file,
      }));
      this.uploadQueue.push(...uploadTasks);
      setTimeout(() => this.processUploadQueue());
    },
  },

  watch: {
    cwd: {
      handler() {
        this.fetchFiles();
        const url = new URL(window.location);
        if ((url.searchParams.get("p") || "") !== this.cwd) {
          this.cwd
            ? url.searchParams.set("p", this.cwd)
            : url.searchParams.delete("p");
          window.history.pushState(null, "", url.toString());
        }
        document.title = `${
          this.cwd.replace(/.*\/(?!$)|\//g, "") || "/"
        } - FlareDrive`;
      },
      immediate: true,
    },
  },

  created() {
    window.addEventListener("popstate", (ev) => {
      const searchParams = new URL(window.location).searchParams;
      if (searchParams.get("p") !== this.cwd)
        this.cwd = searchParams.get("p") || "";
    });
  },

  components: {
    Dialog,
    Menu,
    MimeIcon,
    UploadPopup,
  },
};
</script>

<style>
.main {
  height: 100%;
}

.app-bar {
  position: sticky;
  top: 0;
  padding: 8px;
  background-color: white;
  display: flex;
}

.menu-button {
  display: flex;
  position: relative;
  margin-left: 4px;
}

.menu-button > button {
  transition: background-color 0.2s ease;
}

.menu-button > button:hover {
  background-color: whitesmoke;
}

.menu {
  position: absolute;
  top: 100%;
  right: 0;
}
</style>
