/* eslint-disable react/prop-types */

import { useState } from "react";
import Modal from "./Modal";
import {
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { database } from "../firebase/firebaseConfig";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";

const Docs = () => {
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const [title, setTitle] = useState("");

  const [docsData, setDocsData] = useState([]);
  const isMounted = useRef();

  const collectionRef = collection(database, "docsData");

  let navigate = useNavigate();

  const addData = () => {
    if (title === "") {
      return;
    }

    addDoc(collectionRef, {
      title: title,
      docsDesc: "",
    })
      .then(() => {
        alert("Data Added");
        handleClose();
      })
      .catch(() => {
        alert("Cannot add data");
      });
    setTitle("");
  };

  const getData = () => {
    onSnapshot(collectionRef, (data) => {
      setDocsData(
        data.docs.map((doc) => {
          return { ...doc.data(), id: doc.id };
        })
      );
    });
  };

  function getId(id) {
    navigate(`/editDoc/${id}`);
  }

  useEffect(() => {
    if (isMounted.current) {
      return;
    }
    isMounted.current = true;
    getData();
  }, []);

  function deleteItem(id) {
    const document = doc(collectionRef, id);
    deleteDoc(document, {
      title: "",
      docsDesc: "",
    });
  }

  return (
    <Box sx={{ background: "rgba(0, 0, 0, 0.04)", minHeight: "100vh" }}>
      <Container
        className="docsContainer"
        sx={{
          textAlign: "center",
        }}
        fixed
      >
        <Typography
          variant="h3"
          sx={{
            paddingTop: "1rem",
            marginBottom: ".5rem",
            fontWeight: "700",
            color: "gray",
          }}
        >
          DOCS APP
        </Typography>
        <Button
          variant="outline"
          sx={{
            border: "2px solid gray",
          }}
          onClick={handleOpen}
          startIcon={<AddIcon />}
        >
          Add a Document
        </Button>
        <Modal
          open={open}
          title={title}
          setTitle={setTitle}
          addData={addData}
          handleClose={handleClose}
        />
        <Grid
          container
          spacing={2}
          columns={{ xs: 4, sm: 8, md: 12 }}
          sx={{
            marginTop: "1rem",
          }}
        >
          {docsData.map((docData, index) => {
            return (
              <Grid item key={index} xs={4}>
                <Stack
                  sx={{
                    border: "2px solid gray",
                    borderRadius: "10px",
                    backgroundColor: "transparent",
                    padding: "1rem ",
                    height: "6rem",
                    overflowY: "auto",
                    position: "relative",
                  }}
                >
                  <Stack justifyContent={"center"}>
                    <Typography
                      sx={{
                        fontWeight: "500",
                        textTransform: "capitalize",
                        color: "black",
                        textAlign: "start",
                        width: "75%",
                        wordBreak: "break-all",
                        wordWrap: "break-word",
                        lineHeight: "1rem",
                      }}
                    >
                      {docData.title}
                    </Typography>
                    <Stack
                      position={"absolute"}
                      direction={"row"}
                      spacing={0}
                      sx={{
                        color: "rgba(0,0,0,.6)",
                        right: ".5rem",
                      }}
                    >
                      <IconButton aria-label="delete">
                        <BorderColorOutlinedIcon
                          onClick={() => getId(docData.id)}
                          sx={{
                            cursor: "pointer",
                          }}
                          fontSize="small"
                        />
                      </IconButton>
                      <IconButton aria-label="delete">
                        <DeleteOutlineOutlinedIcon
                          onClick={() => deleteItem(docData.id)}
                          sx={{
                            cursor: "pointer",
                          }}
                          fontSize="small"
                        />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <Typography
                    sx={{
                      marginTop: ".5rem",
                      color: "gray",
                      lineHeight: "1.1rem",
                      textAlign: "start",
                    }}
                    dangerouslySetInnerHTML={{ __html: docData.docsDesc }}
                  />
                </Stack>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
};

export default Docs;
