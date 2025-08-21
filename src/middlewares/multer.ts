import multer, { Multer, StorageEngine } from "multer";

const storage: StorageEngine = multer.memoryStorage();
const upload: Multer = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export default upload;
