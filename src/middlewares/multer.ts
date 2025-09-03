import multer, { Multer, StorageEngine } from "multer";

const storage: StorageEngine = multer.memoryStorage();
const upload: Multer = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
});

export default upload;
