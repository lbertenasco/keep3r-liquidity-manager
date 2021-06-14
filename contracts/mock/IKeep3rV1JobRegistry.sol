// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IKeep3rV1JobRegistry {
    
    function jobData(address _jobAddress) external view returns (
        uint _id,
        address _address,
        string memory _name,
        string memory _ipfs,
        string memory _docs,
        uint _added
    );

}
