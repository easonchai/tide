// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

// Core system
import {CLMSRPosition} from "../src/CLMSR-Market-Maker/core/CLMSRPosition.sol";
import {CLMSRMarketCore} from "../src/CLMSR-Market-Maker/core/CLMSRMarketCore.sol";
import {Vault} from "../src/Vault.sol";

// Proxy
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// Tokens
import {MockERC20} from "../src/MockERC20.sol";

contract DeployCLMSR is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);
        console2.log("Deployer:", deployer);

        // 1) Deploy MockUSDC (6 decimals) and mint initial supply to deployer
        uint256 initialSupply = 1_000_000 * 1e6; // 1M mUSDC
        MockERC20 mockUsdc = new MockERC20(
            "Mock USD Coin",
            "mUSDC",
            6,
            initialSupply
        );
        console2.log("MockUSDC:", address(mockUsdc));

        // 2) Deploy CLMSRPosition implementation and proxy (UUPS pattern via ERC1967Proxy)
        CLMSRPosition posImpl = new CLMSRPosition();
        bytes memory posInit = abi.encodeWithSelector(
            CLMSRPosition.initialize.selector,
            address(0)
        );
        ERC1967Proxy posProxy = new ERC1967Proxy(address(posImpl), posInit);
        CLMSRPosition position = CLMSRPosition(address(posProxy));
        console2.log("CLMSRPosition Proxy:", address(position));
        console2.log("CLMSRPosition Impl:", address(posImpl));

        // 3) Deploy CLMSRMarketCore implementation and proxy, initialize with MockUSDC + Position
        CLMSRMarketCore coreImpl = new CLMSRMarketCore();
        bytes memory coreInit = abi.encodeWithSelector(
            CLMSRMarketCore.initialize.selector,
            address(mockUsdc),
            address(position)
        );
        ERC1967Proxy coreProxy = new ERC1967Proxy(address(coreImpl), coreInit);
        CLMSRMarketCore core = CLMSRMarketCore(address(coreProxy));
        console2.log("CLMSRMarketCore Proxy:", address(core));
        console2.log("CLMSRMarketCore Impl:", address(coreImpl));

        // 4) Wire Position -> Core
        position.updateCore(address(core));

        // 5) Deploy Vault (non-upgradeable) and configure
        Vault vault = new Vault(deployer); // fee recipient = deployer by default
        console2.log("Vault:", address(vault));

        // 6) Set treasury (Vault) and fee rate (2%) on Core
        core.setTreasuryAddress(address(vault));
        core.setFeeRate(200); // 2%

        // 7) Add MockUSDC as supported token in Vault with 2% fee
        vault.addSupportedToken(address(mockUsdc), 200);

        // 8) Log summary
        console2.log("\nDeployment complete:");
        console2.log("  MockUSDC:", address(mockUsdc));
        console2.log("  CLMSRPosition Proxy:", address(position));
        console2.log("  CLMSRMarketCore Proxy:", address(core));
        console2.log("  Vault:", address(vault));

        vm.stopBroadcast();
    }
}
