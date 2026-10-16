import { useState } from 'react'
import { BrowserProvider, Contract, JsonRpcProvider } from 'ethers'
import { QRCodeSVG } from 'qrcode.react'
import {
  FARMPROOF_ABI,
  FARMPROOF_ADDRESS,
  LOCAL_CHAIN_ID,
  LOCAL_RPC_URL,
} from './contract'
import './App.css'

function App() {
  const [search, setSearch] = useState('')
  const [qrBatch, setQrBatch] = useState(null)
  const verificationId = new URLSearchParams(
    window.location.search,
  ).get('batch')
  const [verificationBatch, setVerificationBatch] = useState(null)
  const [verificationHistory, setVerificationHistory] = useState([])
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [verificationError, setVerificationError] = useState('')
  const [manualBatchId, setManualBatchId] = useState('1')
  const [showRegistration, setShowRegistration] = useState(false)

  const [walletAddress, setWalletAddress] = useState('')
  const [walletError, setWalletError] = useState('')
  const [walletLoading, setWalletLoading] = useState(false)

  const [batches, setBatches] = useState([])
  const [batchesLoading, setBatchesLoading] = useState(false)
  const [batchesError, setBatchesError] = useState('')

  const [produceType, setProduceType] = useState('Rice')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('Bags')
  const [registrationError, setRegistrationError] = useState('')
  const [registrationMessage, setRegistrationMessage] = useState('')
  const [registrationLoading, setRegistrationLoading] = useState(false)

  const [selectedBatch, setSelectedBatch] = useState(null)
  const [transferRecipient, setTransferRecipient] = useState('')
  const [transferError, setTransferError] = useState('')
  const [transferMessage, setTransferMessage] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)

  const [statusBatch, setStatusBatch] = useState(null)
  const [newBatchStatus, setNewBatchStatus] = useState('Delivered')
  const [statusUpdateError, setStatusUpdateError] = useState('')
  const [statusUpdateMessage, setStatusUpdateMessage] = useState('')
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false)

  const [historyBatch, setHistoryBatch] = useState(null)
  const [batchHistory, setBatchHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

async function loadBatches() {
  setBatchesLoading(true)
  setBatchesError('')

  try {
    const provider = new BrowserProvider(window.ethereum)
    const network = await provider.getNetwork()

    if (Number(network.chainId) !== LOCAL_CHAIN_ID) {
      throw new Error('Please connect MetaMask to the Anvil Local network.')
    }

    const contract = new Contract(
      FARMPROOF_ADDRESS,
      FARMPROOF_ABI,
      provider,
    )

    const nextBatchId = await contract.getNextBatchId()
    const totalBatches = Number(nextBatchId) - 1
    const loadedBatches = []

    for (let id = 1; id <= totalBatches; id++) {
      const batch = await contract.getBatch(id)

      const statusNames = [
        'Registered',
        'In Transit',
        'Delivered',
        'Sold',
        'Cancelled',
      ]

      const statusIndex = Number(batch.status)

      loadedBatches.push({
        id: `FP-${String(batch.id).padStart(3, '0')}`,
        produce: batch.produceType,
        quantity: `${batch.quantity.toString()} ${batch.unit}`,
        farmer: batch.farmer,
        owner: batch.currentOwner,
        status: statusNames[statusIndex] ?? 'Unknown',
        date: new Date(
          Number(batch.createdAt) * 1000,
        ).toLocaleDateString(),
      })
    }

    setBatches(loadedBatches)

    } catch (error) {
      setBatchesError(
        error.message || 'Unable to load batches from the blockchain.',
      )
    } finally {
      setBatchesLoading(false)
    }
  }

  async function verifyBatch(batchId) {
    setVerificationLoading(true)
    setVerificationError('')
    setVerificationBatch(null)
    setVerificationHistory([])

    try {
      const id = Number(batchId)

      if (!Number.isSafeInteger(id) || id < 1) {
        throw new Error('Please provide a valid batch ID.')
      }

      const provider = new JsonRpcProvider(LOCAL_RPC_URL)

      const contract = new Contract(
        FARMPROOF_ADDRESS,
        FARMPROOF_ABI,
        provider,
      )

      const batch = await contract.getBatch(id)
      const history = await contract.getBatchHistory(id)

      const statusNames = [
        'Registered',
        'In Transit',
        'Delivered',
        'Sold',
        'Cancelled',
      ]

      setVerificationBatch({
        id: `FP-${String(batch.id).padStart(3, '0')}`,
        produce: batch.produceType,
        quantity: `${batch.quantity.toString()} ${batch.unit}`,
        farmer: batch.farmer,
        owner: batch.currentOwner,
        status: statusNames[Number(batch.status)] ?? 'Unknown',
        date: new Date(
          Number(batch.createdAt) * 1000,
        ).toLocaleString(),
      })

      setVerificationHistory(
        history.map((record) => ({
          status: statusNames[Number(record.status)] ?? 'Unknown',
          actor: record.actor,
          timestamp: new Date(
            Number(record.timestamp) * 1000,
          ).toLocaleString(),
        })),
      )
    } catch (error) {
      setVerificationError(
        error.message || 'Unable to verify this batch.',
      )
    } finally {
      setVerificationLoading(false)
    }
  }

  async function loadBatchHistory(batch) {
    setHistoryBatch(batch)
    setBatchHistory([])
    setHistoryError('')
    setHistoryLoading(true)

    try {
      if (!window.ethereum) {
        throw new Error('Please install or enable MetaMask.')
      }

      const provider = new BrowserProvider(window.ethereum)
      const network = await provider.getNetwork()

      if (Number(network.chainId) !== LOCAL_CHAIN_ID) {
        throw new Error('Please connect MetaMask to Anvil Local.')
      }

      const contract = new Contract(
        FARMPROOF_ADDRESS,
        FARMPROOF_ABI,
        provider,
      )

      const batchId = BigInt(
        String(batch.id).replace(/^FP-0*/, ''),
      )

      const historyRecords = await contract.getBatchHistory(batchId)

      const statusNames = [
        'Registered',
        'In Transit',
        'Delivered',
        'Sold',
        'Cancelled',
      ]

      const formattedHistory = historyRecords.map((record, index) => ({
        id: index,
        actor: record.actor,
        from: record.from,
        to: record.to,
        status: statusNames[Number(record.status)] ?? 'Unknown',
        timestamp: new Date(
          Number(record.timestamp) * 1000,
        ).toLocaleString(),
      }))

      setBatchHistory(formattedHistory)
    } catch (error) {
      setHistoryError(
        error.shortMessage ||
          error.reason ||
          error.message ||
          'Unable to load batch history.',
      )
    } finally {
      setHistoryLoading(false)
    }
  }

  const filteredBatches = batches.filter((batch) => {
    const query = search.toLowerCase()

    return (
      batch.id.toLowerCase().includes(query) ||
      batch.produce.toLowerCase().includes(query) ||
      batch.status.toLowerCase().includes(query)
    )
  })

async function connectWallet() {
  setWalletError('')

  if (!window.ethereum) {
    setWalletError(
      'MetaMask was not detected. Install or enable the MetaMask extension.'
    )
    return
  }

  setWalletLoading(true)

  try {
    await window.ethereum.request({
      method: 'eth_requestAccounts',
    })

    const provider = new BrowserProvider(window.ethereum)
    let network = await provider.getNetwork()

    if (Number(network.chainId) !== LOCAL_CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7a69' }],
        })
      } catch (switchError) {
        if (switchError.code !== 4902) {
          throw switchError
        }

        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x7a69',
              chainName: 'Anvil Local',
              nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['http://127.0.0.1:8545'],
            },
          ],
        })
      }

      network = await provider.getNetwork()

      if (Number(network.chainId) !== LOCAL_CHAIN_ID) {
        throw new Error('Please select the Anvil Local network in MetaMask.')
      }
    }

    const signer = await provider.getSigner()
    setWalletAddress(await signer.getAddress())

    await loadBatches()

  } catch (error) {
    setWalletError(
      error.message || 'Wallet connection failed. Please try again.'
    )

  } finally {
    setWalletLoading(false)
  }
}

async function registerProduce(event) {
  event.preventDefault()

  setRegistrationError('')
  setRegistrationMessage('')

  if (!window.ethereum) {
    setRegistrationError('Please install or enable MetaMask.')
    return
  }

  const parsedQuantity = Number(quantity)

  if (!produceType.trim()) {
    setRegistrationError('Please select a produce type.')
    return
  }

  if (!Number.isSafeInteger(parsedQuantity) || parsedQuantity <= 0) {
    setRegistrationError('Quantity must be a positive whole number.')
    return
  }

  if (!unit.trim()) {
    setRegistrationError('Please select a unit.')
    return
  }

  setRegistrationLoading(true)

  try {
    const provider = new BrowserProvider(window.ethereum)
    const network = await provider.getNetwork()

    if (Number(network.chainId) !== LOCAL_CHAIN_ID) {
      throw new Error('Please connect MetaMask to Anvil Local.')
    }

    const signer = await provider.getSigner()

    const contract = new Contract(
      FARMPROOF_ADDRESS,
      FARMPROOF_ABI,
      signer,
    )

    setRegistrationMessage('Please confirm the transaction in MetaMask.')

    const transaction = await contract.registerBatch(
      produceType.trim(),
      parsedQuantity,
      unit.trim(),
    )

    setRegistrationMessage('Transaction submitted. Waiting for confirmation...')

    await transaction.wait()

    setRegistrationMessage('Produce batch registered successfully!')

    setQuantity('')

    await loadBatches()
  } catch (error) {
    setRegistrationError(
      error.shortMessage ||
        error.reason ||
        error.message ||
        'Registration failed.',
    )
    setRegistrationMessage('')

    } finally {
    setRegistrationLoading(false)
  }
}

async function transferOwnership(event) {
  event.preventDefault()

  setTransferError('')
  setTransferMessage('')

  if (!selectedBatch) {
    setTransferError('Please select a batch to transfer.')
    return
  }

  if (!window.ethereum) {
    setTransferError('Please install or enable MetaMask.')
    return
  }

  const recipient = transferRecipient.trim()

  if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
    setTransferError('Enter a valid Ethereum wallet address.')
    return
  }

  if (walletAddress.toLowerCase() === recipient.toLowerCase()) {
    setTransferError('The recipient must be a different wallet address.')
    return
  }

  setTransferLoading(true)

  try {
    const provider = new BrowserProvider(window.ethereum)
    const network = await provider.getNetwork()

    if (Number(network.chainId) !== LOCAL_CHAIN_ID) {
      throw new Error('Please connect MetaMask to Anvil Local.')
    }

    const signer = await provider.getSigner()
    const senderAddress = await signer.getAddress()

    const contract = new Contract(
      FARMPROOF_ADDRESS,
      FARMPROOF_ABI,
      signer,
    )

    const batchId = BigInt(
      String(selectedBatch.id).replace(/^FP-0*/, ''),
    )

    const onChainBatch = await contract.getBatch(batchId)

    if (onChainBatch.currentOwner.toLowerCase() !== senderAddress.toLowerCase()) {
      throw new Error('Only the current batch owner can transfer ownership.')
    }

    setTransferMessage('Please confirm the transfer in MetaMask.')

    const transaction = await contract.transferBatch(
      batchId,
      recipient,
    )

    setTransferMessage('Transaction submitted. Waiting for confirmation...')

    await transaction.wait()

    setTransferMessage('Ownership transferred successfully!')

    await loadBatches()

    setWalletAddress(senderAddress)
    setTransferRecipient('')
  } catch (error) {
    setTransferError(
      error.shortMessage ||
        error.reason ||
        error.message ||
        'Ownership transfer failed.',
    )
    setTransferMessage('')
  } finally {
    setTransferLoading(false)
  }
}

  async function updateBatchStatus(batch, newStatus) {
    setStatusUpdateError('')
    setStatusUpdateMessage('')

    if (!window.ethereum) {
      setStatusUpdateError('Please install or enable MetaMask.')
      throw new Error('Please install or enable MetaMask.')
    }

    setStatusUpdateLoading(true)

    try {
      const provider = new BrowserProvider(window.ethereum)
      const network = await provider.getNetwork()

      if (Number(network.chainId) !== LOCAL_CHAIN_ID) {
        throw new Error('Please connect MetaMask to Anvil Local.')
      }

      const signer = await provider.getSigner()
      const senderAddress = await signer.getAddress()

      const contract = new Contract(
        FARMPROOF_ADDRESS,
        FARMPROOF_ABI,
        signer,
      )

      const batchId = BigInt(
        String(batch.id).replace(/^FP-0*/, ''),
      )

      const onChainBatch = await contract.getBatch(batchId)

      if (
        onChainBatch.currentOwner.toLowerCase() !==
        senderAddress.toLowerCase()
      ) {
        throw new Error(
          'Only the current batch owner can update its status.',
        )
      }

      const statusValues = {
        Registered: 0,
        'In Transit': 1,
        Delivered: 2,
        Sold: 3,
        Cancelled: 4,
      }

      if (!(newStatus in statusValues)) {
        throw new Error('Please select a valid batch status.')
      }

      setStatusUpdateMessage(
        'Please confirm the status update in MetaMask.',
      )

      const transaction = await contract.updateStatus(
        batchId,
        statusValues[newStatus],
      )

      setStatusUpdateMessage(
        'Transaction submitted. Waiting for confirmation...',
      )

      const receipt = await transaction.wait()

      if (!receipt || receipt.status !== 1) {
        throw new Error('The blockchain transaction failed.')
      }

      await loadBatches()

      setStatusUpdateMessage(
        `Batch status updated to ${newStatus}. Transaction: ${transaction.hash}`,
      )
    } catch (error) {
      const message =
        error.shortMessage ||
        error.reason ||
        error.message ||
        'Status update failed.'

      setStatusUpdateError(message)
      setStatusUpdateMessage('')

      throw error
    } finally {
      setStatusUpdateLoading(false)
    }
  }

  const stats = [
    {
      label: 'Total batches',
      value: String(batches.length).padStart(2, '0'),
      icon: '▦',
    },
    {
      label: 'In transit',
      value: String(
        batches.filter((batch) => batch.status === 'In Transit').length,
      ).padStart(2, '0'),
      icon: '↗',
    },
    {
      label: 'Delivered',
      value: String(
        batches.filter((batch) => batch.status === 'Delivered').length,
      ).padStart(2, '0'),
      icon: '✓',
    },
    {
      label: 'Registered',
      value: String(
        batches.filter((batch) => batch.status === 'Registered').length,
      ).padStart(2, '0'),
      icon: '◷',
    },
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="FarmProof home">
          <span className="brand-icon">F</span>
          <span>
            <strong>FarmProof</strong>
            <small>TRUST IN EVERY HARVEST</small>
          </span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="navigation">
          <a className="nav-item active" href="#dashboard">
            <span>▦</span> Dashboard
          </a>
          <a className="nav-item" href="#batches">
            <span>◫</span> Produce batches
          </a>
          <a className="nav-item" href="#activity">
            <span>↗</span> Traceability
          </a>
        </nav>

        <div className="sidebar-label tools-label">TOOLS</div>

        <nav className="navigation">
          <button
            className="nav-item"
            onClick={() => setShowRegistration(true)}
          >
            <span>＋</span> Register produce
          </button>
          <a className="nav-item" href="#verification">
            <span>⌗</span> Batch verification
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="network-indicator">
            <span className="status-dot" />
            <span>
              <strong>Development preview</strong>
              <small>Blockchain connection pending</small>
            </span>
          </div>
          <p>FarmProof MVP · 2026</p>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div>
            <div className="breadcrumb">Workspace / Dashboard</div>
            <h1>Good day, welcome back.</h1>
            <p className="page-subtitle">
              Monitor your agricultural supply chain in one place.
            </p>
          </div>

          <button
  className="wallet-button"
  onClick={connectWallet}
  disabled={walletLoading}
  title={
    walletAddress
      ? `Connected wallet: ${walletAddress}`
      : 'Connect your MetaMask wallet'
  }
>
  <span>◉</span>{' '}
  {walletLoading
    ? 'Connecting...'
    : walletAddress
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : 'Connect Wallet'}
        </button>
        </header>

        {walletError && (
          <p role="alert" className="wallet-error">
            {walletError}
          </p>
        )}

        <section className="welcome-banner">
          <div className="welcome-copy">
            <span className="eyebrow">TRANSPARENCY FROM FARM TO MARKET</span>
            <h2>Every batch has a story.</h2>
            <p>
              Track produce movement, inspect recorded events, and build trust
              across the agricultural supply chain.
            </p>
            <button
              className="primary-button"
              onClick={() => setShowRegistration(true)}
            >
              <span>＋</span> Register a batch
            </button>
          </div>

          <div className="banner-illustration" aria-hidden="true">
            <span className="sun" />
            <span className="field field-back" />
            <span className="field field-front" />
            <span className="plant plant-one">♣</span>
            <span className="plant plant-two">♣</span>
            <span className="plant plant-three">♣</span>
          </div>
        </section>

        <section className="section-heading">
          <div>
            <h2>Supply chain overview</h2>
            <p>A quick look at the current demo records.</p>
          </div>
          <span className="demo-badge">DEMO DATA</span>
        </section>

        <section className="stats-grid" aria-label="Batch summary">
          {stats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <div className="stat-top">
                <span className="stat-label">{stat.label}</span>
                <span className="stat-icon">{stat.icon}</span>
              </div>
              <strong className="stat-value">{stat.value}</strong>
              <span className="stat-note">Illustrative records</span>
            </article>
          ))}
        </section>

        <section className="batch-section" id="batches">
          <div className="section-heading batch-heading">
            <div>
              <h2>Recent produce batches</h2>
              <p>Search the sample records shown in this preview.</p>
            </div>

            <button
              className="secondary-button"
              onClick={() => setShowRegistration(true)}
            >
              ＋ New batch
            </button>
          </div>

          <div className="table-toolbar">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search by batch ID, produce or status..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <span className="record-count">
              {filteredBatches.length} blockchain records
            </span>
          </div>
   {batchesLoading && (
     <p role="status">Loading batches from the blockchain...</p>
   )}

   {batchesError && (
     <p role="alert" className="wallet-error">
       Unable to load blockchain records: {batchesError}
     </p>
   )}

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Produce</th>
                  <th>Quantity</th>
                  <th>Farmer address</th>
                  <th>Status</th>
                  <th>Record type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((batch) => (
                  <tr key={batch.id}>
                    <td>
                      <strong className="batch-id">{batch.id}</strong>
                    </td>
                    <td>{batch.produce}</td>
                    <td>{batch.quantity}</td>
                    <td className="address">{batch.farmer}</td>
                    <td>
                      <span
                        className={`status-pill ${batch.status
                          .toLowerCase()
                          .replaceAll(' ', '-')}`}
                      >
                        {batch.status}
                      </span>
                    </td>
                    <td>{batch.date}</td>

                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          setSelectedBatch(batch)
                          setTransferRecipient('')
                          setTransferError('')
                          setTransferMessage('')
                        }}
                      >
                        Transfer Ownership
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        disabled={transferLoading}
			onClick={() => {
                          setStatusBatch(batch)
                          setNewBatchStatus(
                            batch.status === 'Registered'
                              ? 'In Transit'
                              : batch.status === 'In Transit'
                                ? 'Delivered'
                                : batch.status === 'Delivered'
                                ? 'Sold'
                                : 'Delivered',
                          )
                          setStatusUpdateError('')
                          setStatusUpdateMessage('')
                        }}
                      >
                        Update Status
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => loadBatchHistory(batch)}
                      >
                        View History
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setQrBatch(batch)}
                      >
                        Generate QR Code
                      </button>

                  </td>

                  </tr>
                ))}

                {filteredBatches.length === 0 && (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      No blockchain records match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="demo-disclaimer">
            Records are loaded from the FarmProof smart contract on the
            Anvil development network. Verify the connected network before
            relying on the displayed information.
          </p>
        </section>

        <section className="verification-card" id="verification">
          <div className="verification-icon">⌗</div>

          <div className="verification-content">
            <h2>Verify a produce batch</h2>
            <p>
              Inspect a batch's details and recorded blockchain journey.
            </p>

            <div className="verification-form">
              <label htmlFor="verification-batch-id">
                Batch ID
              </label>

              <input
                id="verification-batch-id"
                type="text"
                value={verificationId || manualBatchId}
                onChange={(event) => setManualBatchId(event.target.value)}
                placeholder="Enter 1 or FP-001"
                disabled={Boolean(verificationId)}
              />

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  verifyBatch(
                    (verificationId || manualBatchId).replace(/^FP-/, ''),
                  )
                }
                disabled={verificationLoading}
              >
                {verificationLoading ? 'Verifying batch...' : 'Verify batch'}
              </button>
            </div>

            {verificationError && (
              <p role="alert" className="wallet-error">
                {verificationError}
              </p>
            )}

            {verificationBatch && (
              <div className="verification-results">
                <h3>Batch {verificationBatch.id}</h3>

                <p>
                  <strong>Produce:</strong> {verificationBatch.produce}
                </p>

                <p>
                  <strong>Quantity:</strong> {verificationBatch.quantity}
                </p>

                <p>
                  <strong>Farmer:</strong> {verificationBatch.farmer}
                </p>

                <p>
                  <strong>Current owner:</strong> {verificationBatch.owner}
                </p>

                <p>
                  <strong>Status:</strong> {verificationBatch.status}
                </p>

                <p>
                  <strong>Registered:</strong> {verificationBatch.date}
                </p>

                <h3>Blockchain history</h3>

                {verificationHistory.length === 0 ? (
                  <p>No history records found.</p>
                ) : (
                  <ol>
                    {verificationHistory.map((record, index) => (
                      <li key={`${record.timestamp}-${index}`}>
                        <strong>{record.status}</strong>
                        <br />
                        {record.timestamp}
                        <br />
                        <span className="address">{record.actor}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        </section>

        <footer id="activity">
          <span>FarmProof · Agricultural traceability</span>
          <span>Preview interface · Not yet connected to the blockchain</span>
        </footer>
      </main>

      {showRegistration && (
        <div
          className="modal-backdrop"
          onClick={() => setShowRegistration(false)}
        >
          <section
            className="registration-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="registration-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Close registration preview"
              onClick={() => setShowRegistration(false)}
            >
              ×
            </button>
            <span className="eyebrow">NEW PRODUCE BATCH</span>
            <h2 id="registration-title">Register your produce</h2>
            <form onSubmit={registerProduce}>
            <p>
              Register a produce batch on the FarmProof blockchain.
              Confirm the transaction in MetaMask to complete registration.
            </p>
            <label>
              Produce type
              <select
                value={produceType}
                onChange={(event) => setProduceType(event.target.value)}
              >
                <option>Rice</option>
                <option>Beans</option>
                <option>Maize</option>
                <option>Cassava</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Quantity
              <input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 100"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
            </label>
            <label>
              Unit
              <select
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
              >
                <option>Bags</option>
                <option>Kilograms</option>
                <option>Tonnes</option>
                <option>Crates</option>
              </select>
            </label>
            {registrationError && (
              <p role="alert" className="wallet-error">
                {registrationError}
              </p>
            )}

            {registrationMessage && (
              <p role="status">
                {registrationMessage}
              </p>
            )}

            <button
              type="submit"
              className="primary-button full-width"
              disabled={registrationLoading}
            >
              {registrationLoading ? 'Registering...' : 'Register produce'}
            </button>
            </form>
          </section>
        </div>
      )}

      {selectedBatch && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedBatch(null)}
        >
          <section
            className="registration-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transfer-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Close transfer modal"
              onClick={() => setSelectedBatch(null)}
            >
              ×
            </button>

            <span className="eyebrow">TRANSFER OWNERSHIP</span>

            <h2 id="transfer-title">
              Transfer batch {selectedBatch.id}
            </h2>

            <p>
              Transfer ownership of {selectedBatch.produce} to another
              Ethereum wallet address.
            </p>

            <form onSubmit={transferOwnership}>
              <label>
                Recipient wallet address
                <input
                  type="text"
                  placeholder="0x..."
                  value={transferRecipient}
                  onChange={(event) =>
                    setTransferRecipient(event.target.value)
                  }
                  required
                />
              </label>

              {transferError && (
                <p role="alert" className="wallet-error">
                  {transferError}
                </p>
              )}

              {transferMessage && (
                <p role="status">
                  {transferMessage}
                </p>
              )}

              <button
                type="submit"
                className="primary-button full-width"
                disabled={transferLoading}
              >
                {transferLoading
                  ? 'Transferring...'
                  : 'Confirm ownership transfer'}
              </button>
            </form>
          </section>
        </div>
      )}
      {statusBatch && (
        <div
          className="modal-backdrop"
          onClick={() => setStatusBatch(null)}
        >
          <section
            className="registration-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-update-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Close status update modal"
              onClick={() => setStatusBatch(null)}
            >
              ×
            </button>

            <span className="eyebrow">UPDATE BATCH STATUS</span>

            <h2 id="status-update-title">
              Update batch {statusBatch.id}
            </h2>

            <p>
              Record the next stage of {statusBatch.produce}'s journey
              on the FarmProof blockchain.
            </p>

            <form
              onSubmit={async (event) => {
                event.preventDefault()
                setStatusUpdateError('')
                setStatusUpdateMessage('')
                setStatusUpdateLoading(true)

                try {
                  await updateBatchStatus(statusBatch, newBatchStatus)
                  setStatusUpdateMessage(
                    `Batch status updated to ${newBatchStatus}.`,
                  )
                } catch (error) {
                  setStatusUpdateError(
                    error.shortMessage ||
                      error.reason ||
                      error.message ||
                      'Status update failed.',
                  )
                } finally {
                  setStatusUpdateLoading(false)
                }
              }}
            >
              <label>
                Current status
                <input
                  type="text"
                  value={statusBatch.status}
                  readOnly
                />
              </label>

              <label>
                New status
                <select
                  value={newBatchStatus}
                  onChange={(event) =>
                    setNewBatchStatus(event.target.value)
                  }
                  required
                >
                  {(
                    statusBatch.status === 'Registered'
                      ? ['In Transit', 'Cancelled']
                      : statusBatch.status === 'In Transit'
                        ? ['Delivered', 'Cancelled']
                        : statusBatch.status === 'Delivered'
                          ? ['Sold']
                          : []
                  ).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              {statusUpdateError && (
                <p role="alert" className="wallet-error">
                  {statusUpdateError}
                </p>
              )}

              {statusUpdateMessage && (
                <p role="status">
                  {statusUpdateMessage}
                </p>
              )}

              <button
                type="submit"
                className="primary-button full-width"
                disabled={statusUpdateLoading}
              >
                {statusUpdateLoading
                  ? 'Updating status...'
                  : 'Confirm status update'}
              </button>
            </form>
          </section>
        </div>
      )}

      {historyBatch && (
        <div
          className="modal-backdrop"
          onClick={() => setHistoryBatch(null)}
        >
          <section
            className="registration-modal history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Close batch history"
              onClick={() => setHistoryBatch(null)}
            >
              ×
            </button>

            <span className="eyebrow">BLOCKCHAIN TRACEABILITY</span>

            <h2 id="history-title">
              History of batch {historyBatch.id}
            </h2>

            <p>
              Recorded journey of {historyBatch.produce} (
              {historyBatch.quantity}).
            </p>

            {historyLoading && (
              <p role="status">Loading history from the blockchain...</p>
            )}

            {historyError && (
              <p role="alert" className="wallet-error">
                {historyError}
              </p>
            )}

            {!historyLoading &&
              !historyError &&
              batchHistory.length === 0 && (
                <p>No history records were found for this batch.</p>
              )}

            {!historyLoading && batchHistory.length > 0 && (
              <div className="history-timeline">
                {batchHistory.map((record, index) => (
                  <article
                    className="history-entry"
                    key={`${record.id}-${record.timestamp}`}
                  >
                    <div className="history-marker">{index + 1}</div>

                    <div className="history-entry-content">
                      <h3>{record.status}</h3>

                      <p className="history-timestamp">
                        {record.timestamp}
                      </p>

                      <p>
                        <strong>Actor:</strong>
                        <br />
                        <span className="address">{record.actor}</span>
                      </p>

                      {record.from !==
                        '0x0000000000000000000000000000000000000000' && (
                        <p>
                          <strong>Previous owner:</strong>
                          <br />
                          <span className="address">{record.from}</span>
                        </p>
                      )}

                      {record.to !==
                        '0x0000000000000000000000000000000000000000' && (
                        <p>
                          <strong>Recipient / owner:</strong>
                          <br />
                          <span className="address">{record.to}</span>
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            <button
              type="button"
              className="primary-button full-width"
              onClick={() => setHistoryBatch(null)}
            >
              Close history
            </button>
          </section>
        </div>
      )}

            {qrBatch && (
        <div
          className="modal-backdrop"
          onClick={() => setQrBatch(null)}
        >
          <section
            className="registration-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Close QR code"
              onClick={() => setQrBatch(null)}
            >
              ×
            </button>

            <span className="eyebrow">FARMPROOF VERIFICATION</span>

            <h2 id="qr-title">QR Code for {qrBatch.id}</h2>

            <p>
              Scan this code to open the FarmProof dashboard for
              verification.
            </p>

            <div className="qr-code-container">
              <QRCodeSVG
                value={`${window.location.origin}/?batch=${qrBatch.id.replace('FP-', '')}`}
                size={220}
                level="H"
                includeMargin
              />
            </div>

            <p className="history-timestamp">
              Batch: {qrBatch.id}
            </p>

            <p>
              <strong>Produce:</strong> {qrBatch.produce}
              <br />
              <strong>Quantity:</strong> {qrBatch.quantity}
              <br />
              <strong>Status:</strong> {qrBatch.status}
            </p>

            <button
              type="button"
              className="primary-button full-width"
              onClick={() => window.print()}
            >
              Print QR Code
            </button>
          </section>
        </div>
      )}

    </div>
  )
}

export default App
