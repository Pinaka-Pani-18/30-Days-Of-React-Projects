/* eslint-disable react/prop-types */
import { styled } from "@mui/material/styles";
import { Button, TextField } from "@mui/material";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  minWidth: 250,
  borderRadius: "1rem",
  bgcolor: "rgba(255,255,255,.7)",
  border: "2px solid gray",
  boxShadow: 24,
  padding: "2rem",
  textAlign: "center",
};

const CssTextField = styled(TextField)({
  "& label.Mui-focused": {
    color: "gray",
  },
  "& .MuiInput-underline:after": {
    border: "2px solid",
    borderBottomColor: "#B2BAC2",
  },
  "& .MuiOutlinedInput-root": {
    "& fieldset": {
      borderColor: "gray",
      border: "2px solid gray",
    },
    "&:hover fieldset": {
      borderColor: "gray",
    },
    "&.Mui-focused fieldset": {
      borderColor: "gray",
    },
  },
});

export default function ModalComponent({
  open,
  handleClose,
  title,
  setTitle,
  addData,
}) {
  return (
    <div>
      <Modal
        keepMounted
        open={open}
        onClose={handleClose}
        aria-labelledby="keep-mounted-modal-title"
        aria-describedby="keep-mounted-modal-description"
      >
        <Box sx={style}>
          <CssTextField
            sx={{
              width: "100%",
            }}
            label="Add Title"
            id="custom-css-outlined-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Button
            variant="outline"
            sx={{
              marginTop: "2rem",
              paddingX: "4rem",
              border: "2px solid gray",
            }}
            onClick={addData}
          >
            Add
          </Button>
        </Box>
      </Modal>
    </div>
  );
}
