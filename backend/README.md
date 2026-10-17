# Saltare pose API

From the repository root, install the Python dependencies and start the API:

```powershell
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

Start the frontend separately with `npm run dev` from `frontend/`. The game requests camera permission, sends JPEG frames to the API, and displays the running score. Set `VITE_API_URL` when the API is not at `http://127.0.0.1:8000`.

Reference dances are discovered from `output/*_pose.npz`; each file must contain the notebook keys `keypoints_normalized`, `fps`, and `joint_names`. The matching metadata JSON is used for display information.