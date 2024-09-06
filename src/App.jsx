import React, { useEffect, useState, useCallback, useRef } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ethers } from "ethers";
import "./App.css";
import abi from "./utils/WavePortal.json";

export default function App() {
  const [currentAccount, setCurrentAccount] = useState("");
  const [userMsg, setUserMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [miningWave, setMiningWave] = useState(false);
  const [totalWave, setTotalWave] = useState(0);
  const [allWaves, setAllWaves] = useState([]);
  const toastId = useRef(null);
  const contractAddress = "0x4e3c20bEfFC46bD089A07f554F62fF899FCfB1Fc";
  const contractABI = abi.abi;

  const notify = () =>
    (toastId.current = toast("Waiting for wave to be mined...", {
      autoClose: false,
      position: toast.POSITION.BOTTOM_CENTER,
    }));

  const update = () =>
    toast.update(toastId.current, {
      render: "Success",
      type: toast.TYPE.SUCCESS,
      autoClose: 3000,
      position: toast.POSITION.BOTTOM_CENTER,
    });

  const handleErrMsg = (msg) => {
    setErrMsg(msg);
    setTimeout(() => {
      setErrMsg("");
    }, 3000);
  };

  // used this 👇👇 to check if we have access to the ethereum obj
  const checkWalletConn = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        console.log("Make sure you have metamask!");
      } else {
        console.log("We have the ethereum object", ethereum);
      }

      // used this 👇👇 to check if we're auth to access user's wallet
      const accts = await ethereum.request({ method: "eth_accounts" });

      if (accts.length != 0) {
        const acct = accts[0];
        console.log("Found an authorize account:", acct);
        setCurrentAccount(acct);
        getAllWaves();
      } else {
        console.log("No authorized account found");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        // alert("Get metamask to connect wallet!")
        handleErrMsg("Get metamask to connect wallet!");
        return;
      }

      const accts = await ethereum.request({ method: "eth_requestAccounts" });

      console.log("connected", accts[0]);
      setCurrentAccount(accts[0]);
    } catch (error) {
      console.log(error);
    }
  };

  const wave = async () => {
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );

        /****************************
         * write data from blockchain
         * get total wave count
         ******************************/
        const waveTxn = await wavePortalContract.wave(
          userMsg !== "" ? userMsg : "User waved",
          { gasLimit: 300000 }
        );
        setMiningWave(true);
        notify();
        console.log("Mining...", waveTxn.hash);

        await waveTxn.wait();
        setMiningWave(false);
        update();
        setUserMsg("");
        console.log("Mined -- ", waveTxn.hash);

        let count = await wavePortalContract.getTotalWaves();
        setTotalWave(count.toNumber());
        console.log("Retrieved total wave count...", count.toNumber());
      } else {
        console.log("ethereum object does not exist");
        handleErrMsg("Connect your wallet!");
      }
    } catch (error) {
      console.log(error);
      setMiningWave(false);
      handleErrMsg("Sorry, something went wrong");
    }
  };

  /****************************
   * read data in blockchain from a webClient
   * get total wave count
   ******************************/
  const getTotalWave = useCallback(async () => {
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );

        let count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved total wave count...", count.toNumber());
        setTotalWave(count.toNumber());
      }
    } catch (error) {
      console.log(error);
    }
  }, []);

  /****************************
   * get all waves
   ******************************/
  const getAllWaves = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );

        const waves = await wavePortalContract.getAllWaves();

        let wavesCleaned = [];
        waves.forEach((wave) => {
          wavesCleaned.unshift({
            address: wave.waver,
            timestamp: new Date(wave.timestamp * 1000),
            message: wave.message,
          });
        });

        console.log("all waves", wavesCleaned);
        setAllWaves(wavesCleaned);
      } else {
        console.log("etherum object does not exist");
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (errMsg) {
      toast.error(errMsg, {
        position: toast.POSITION.TOP_RIGHT,
        autoClose: 3000,
      });
    }
  }, [errMsg]);

  useEffect(() => {
    checkWalletConn();
    getTotalWave();
  }, []);

  /*******************************
   * Listen in for emitter events!
   ********************************/
  useEffect(() => {
    let wavePortalContract;

    const onNewWave = (from, timestamp, message) => {
      console.log("NewWave", from, timestamp, message);
      setAllWaves((prevState) => [
        {
          address: from,
          timestamp: new Date(timestamp * 1000),
          message: message,
        },
        ...prevState,
      ]);
    };

    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      wavePortalContract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );
      wavePortalContract.on("NewWave", onNewWave);
    }

    return () => {
      if (wavePortalContract) {
        wavePortalContract.off("NewWave", onNewWave);
      }
    };
  }, []);

  return (
    <>
      <ToastContainer />
      <div className="mainContainer">
        <div className="dataContainer">
          <div className="app-header">
            {currentAccount && (
              <p className="w-50 fw-bold">Total waves: {totalWave}</p>
            )}
            {!currentAccount && (
              <div
                style={!currentAccount ? { width: "100%" } : {}}
                className="connButton-container"
              >
                <button className="connButton" onClick={connectWallet}>
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
          <div className="header">👋 Hey there!</div>

          <div className="bio">
            I'm maurice and I am a frontend developer learning how to build web3
            apps with Buildspace. Connect your Ethereum wallet and wave at me!
          </div>

          <input
            type="text"
            value={userMsg}
            placeholder="send me a message"
            onChange={(e) => {
              setUserMsg(e.target.value);
            }}
            className="msgBox"
          />
          <button className="waveButton" onClick={wave}>
            {miningWave ? "Waving..." : "Wave at Me"}
          </button>

          {allWaves.map((wave, index) => {
            return (
              <div key={index} className={"waveCard"}>
                <div>
                  <span className="txt-dark">Address: </span>
                  {wave.address}
                </div>
                <div>
                  <span className="txt-dark">Time: </span>{" "}
                  {wave.timestamp.toString()}
                </div>
                <div>
                  <span className="txt-dark">Message: </span> {wave.message}
                </div>
              </div>
            );
          })}
        </div>
        <br />
        <br />
      </div>
    </>
  );
}
